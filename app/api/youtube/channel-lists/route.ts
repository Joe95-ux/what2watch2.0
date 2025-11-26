import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  attachViewerStateToLists,
  channelListInclude,
  normalizeChannelListItems,
  sanitizeListTags,
  resolveCurrentUserId,
} from "./helpers";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function buildListWhere(scope: string, currentUserId: string | null, userIdParam: string | null) {
  if (scope === "mine") {
    if (!currentUserId) {
      throw new Error("AUTH_REQUIRED");
    }
    return { userId: currentUserId };
  }

  if (scope === "following") {
    if (!currentUserId) {
      throw new Error("AUTH_REQUIRED");
    }
    return {
      followedBy: {
        some: {
          userId: currentUserId,
        },
      },
    };
  }

  if (userIdParam) {
    return {
      userId: userIdParam,
      isPublic: true,
    };
  }

  return { isPublic: true };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const scope = searchParams.get("scope") ?? "public";
    const limitParam = Number(searchParams.get("limit") || DEFAULT_LIMIT);
    const limit = Math.max(1, Math.min(limitParam, MAX_LIMIT));
    const userIdParam = searchParams.get("userId");

    const { userId: currentUserId } = await resolveCurrentUserId();
    let where;

    try {
      where = buildListWhere(scope, currentUserId, userIdParam);
    } catch (error) {
      if (error instanceof Error && error.message === "AUTH_REQUIRED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      throw error;
    }

    const lists = await db.youTubeChannelList.findMany({
      where,
      include: channelListInclude,
      take: limit,
      orderBy:
        scope === "mine"
          ? { updatedAt: "desc" }
          : scope === "following"
            ? { updatedAt: "desc" }
            : { followersCount: "desc" },
    });

    const hydrated = await attachViewerStateToLists(lists, currentUserId);

    return NextResponse.json({ lists: hydrated });
  } catch (error) {
    console.error("[YouTubeChannelLists] GET error", error);
    return NextResponse.json(
      { error: "Failed to fetch channel lists" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId: currentUserId } = await resolveCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, description, isPublic = false, tags, coverImage, channels } =
      await request.json();

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "List name is required" }, { status: 400 });
    }

    const normalizedChannels = normalizeChannelListItems(channels);
    if (normalizedChannels.length === 0) {
      return NextResponse.json(
        { error: "Add at least one channel to the list" },
        { status: 400 }
      );
    }

    const sanitizedTags = sanitizeListTags(tags);
    const trimmedDescription =
      typeof description === "string" ? description.trim() : null;
    const cleanedCoverImage =
      typeof coverImage === "string" && coverImage.trim()
        ? coverImage.trim()
        : normalizedChannels[0]?.channelThumbnail ?? null;

    const list = await db.youTubeChannelList.create({
      data: {
        userId: currentUserId,
        name: name.trim(),
        description: trimmedDescription,
        isPublic: Boolean(isPublic),
        coverImage: cleanedCoverImage,
        tags: sanitizedTags,
        items: {
          create: normalizedChannels.map((item, index) => ({
            channelId: item.channelId,
            channelTitle: item.channelTitle,
            channelThumbnail: item.channelThumbnail,
            channelDescription: item.channelDescription,
            subscriberCount: item.subscriberCount,
            videoCount: item.videoCount,
            channelUrl: item.channelUrl,
            notes: item.notes,
            position: item.position ?? index + 1,
          })),
        },
      },
      include: channelListInclude,
    });

    const [hydrated] = await attachViewerStateToLists([list], currentUserId);

    return NextResponse.json({ list: hydrated });
  } catch (error) {
    console.error("[YouTubeChannelLists] POST error", error);
    return NextResponse.json(
      { error: "Failed to create channel list" },
      { status: 500 }
    );
  }
}

