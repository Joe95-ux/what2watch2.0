import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  attachViewerStateToLists,
  channelListInclude,
  normalizeChannelListItems,
  sanitizeListTags,
  resolveCurrentUserId,
} from "../helpers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const { userId: currentUserId } = await resolveCurrentUserId();
    const { listId } = await params;

    const list = await db.youTubeChannelList.findUnique({
      where: { id: listId },
      include: channelListInclude,
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    if (!list.isPublic && list.userId !== currentUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [hydrated] = await attachViewerStateToLists([list], currentUserId);
    return NextResponse.json({ list: hydrated });
  } catch (error) {
    console.error("[YouTubeChannelLists] GET detail error", error);
    return NextResponse.json(
      { error: "Failed to fetch channel list" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const { userId: currentUserId } = await resolveCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { listId } = await params;
    const existing = await db.youTubeChannelList.findUnique({
      where: { id: listId },
    });

    if (!existing) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    if (existing.userId !== currentUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {};

    if (typeof body.name === "string" && body.name.trim()) {
      updates.name = body.name.trim();
    }

    if (typeof body.description !== "undefined") {
      updates.description =
        typeof body.description === "string" && body.description.trim()
          ? body.description.trim()
          : null;
    }

    if (typeof body.isPublic === "boolean") {
      updates.isPublic = body.isPublic;
    }

    if (typeof body.coverImage !== "undefined") {
      updates.coverImage =
        typeof body.coverImage === "string" && body.coverImage.trim()
          ? body.coverImage.trim()
          : null;
    }

    if (typeof body.tags !== "undefined") {
      updates.tags = sanitizeListTags(body.tags);
    }

    const normalizedChannels = normalizeChannelListItems(body.channels);
    const shouldReplaceItems =
      Array.isArray(body.channels) && normalizedChannels.length > 0;

    const updated = await db.$transaction(async (tx) => {
      if (shouldReplaceItems) {
        await tx.youTubeChannelListItem.deleteMany({
          where: { listId },
        });
        updates.items = {
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
        };
      }

      return tx.youTubeChannelList.update({
        where: { id: listId },
        data: updates,
        include: channelListInclude,
      });
    });

    const [hydrated] = await attachViewerStateToLists([updated], currentUserId);
    return NextResponse.json({ list: hydrated });
  } catch (error) {
    console.error("[YouTubeChannelLists] PATCH error", error);
    return NextResponse.json(
      { error: "Failed to update channel list" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const { userId: currentUserId } = await resolveCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { listId } = await params;
    const existing = await db.youTubeChannelList.findUnique({
      where: { id: listId },
      select: { id: true, userId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    if (existing.userId !== currentUserId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.youTubeChannelList.delete({
      where: { id: listId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[YouTubeChannelLists] DELETE error", error);
    return NextResponse.json(
      { error: "Failed to delete channel list" },
      { status: 500 }
    );
  }
}

