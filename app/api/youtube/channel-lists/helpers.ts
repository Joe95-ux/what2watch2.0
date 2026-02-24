import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export const channelListInclude = {
  items: {
    orderBy: { position: "asc" as const },
  },
  user: {
    select: {
      id: true,
      username: true,
      displayName: true,
      avatarUrl: true,
    },
  },
  _count: {
    select: {
      items: true,
      followedBy: true,
    },
  },
};

export type ChannelListWithRelations = Prisma.YouTubeChannelListGetPayload<{
  include: typeof channelListInclude;
}>;

export interface ChannelListResponse extends ChannelListWithRelations {
  viewerState: {
    isOwner: boolean;
    isFollowing: boolean;
  };
}

export async function resolveCurrentUserId() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return { clerkUserId: null, userId: null };
  }

  const user = await db.user.findUnique({
    where: { clerkId: clerkUserId },
    select: { id: true },
  });

  return { clerkUserId, userId: user?.id ?? null };
}

export function sanitizeListTags(input: unknown, max = 8) {
  if (!input) return [];

  const tagsArray = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? input.split(",")
      : [];

  const unique: string[] = [];
  for (const raw of tagsArray) {
    if (typeof raw !== "string") continue;
    const cleaned = raw.trim().slice(0, 32);
    if (!cleaned) continue;
    const normalized = cleaned.toLowerCase();
    if (!unique.some((tag) => tag.toLowerCase() === normalized)) {
      unique.push(cleaned);
    }
    if (unique.length >= max) break;
  }
  return unique;
}

export interface ChannelListItemInput {
  channelId: string;
  channelTitle?: string | null;
  channelThumbnail?: string | null;
  channelDescription?: string | null;
  subscriberCount?: string | null;
  videoCount?: string | null;
  channelUrl?: string | null;
  notes?: string | null;
  position?: number;
}

export function normalizeChannelListItems(input: unknown) {
  if (!Array.isArray(input)) return [];

  const normalized: ChannelListItemInput[] = [];

  input.forEach((item, index) => {
    if (!item || typeof item !== "object") return;
    const source = item as Record<string, unknown>;
    const rawId =
      (typeof source.channelId === "string" && source.channelId) ||
      (typeof source.id === "string" && source.id) ||
      "";
    const channelId = rawId.trim();
    if (!channelId) return;

    const entry: ChannelListItemInput = {
      channelId,
      channelTitle:
        typeof source.channelTitle === "string"
          ? source.channelTitle.trim()
          : typeof source.title === "string"
            ? source.title.trim()
            : null,
      channelThumbnail:
        typeof source.channelThumbnail === "string"
          ? source.channelThumbnail
          : typeof source.thumbnail === "string"
            ? source.thumbnail
            : null,
      channelDescription:
        typeof source.channelDescription === "string"
          ? source.channelDescription
          : typeof source.description === "string"
            ? source.description
            : null,
      subscriberCount:
        typeof source.subscriberCount === "string"
          ? source.subscriberCount
          : source.subscriberCount
              ? String(source.subscriberCount)
              : null,
      videoCount:
        typeof source.videoCount === "string"
          ? source.videoCount
          : source.videoCount
              ? String(source.videoCount)
              : null,
      channelUrl:
        typeof source.channelUrl === "string"
          ? source.channelUrl
          : typeof source.url === "string"
            ? source.url
            : null,
      notes:
        typeof source.notes === "string"
          ? source.notes.slice(0, 280)
          : null,
      position:
        typeof source.position === "number"
          ? source.position
          : index + 1,
    };

    normalized.push(entry);
  });

  return normalized;
}

export async function attachViewerStateToLists(
  lists: ChannelListWithRelations[],
  currentUserId: string | null
): Promise<ChannelListResponse[]> {
  if (!lists.length) {
    return [];
  }

  let followingIds = new Set<string>();
  if (currentUserId) {
    const follows = await db.youTubeChannelListFollow.findMany({
      where: {
        userId: currentUserId,
        listId: { in: lists.map((list) => list.id) },
      },
      select: { listId: true },
    });
    followingIds = new Set(follows.map((follow) => follow.listId));
  }

  // Calculate viewsCount for all lists in a single query
  const listIds = lists.map((list) => list.id);
  const viewsCounts = await db.youTubeChannelListEngagementEvent.groupBy({
    by: ["listId"],
    where: {
      listId: { in: listIds },
      type: "VISIT",
    },
    _count: {
      id: true,
    },
  });

  const viewsCountMap = new Map(
    viewsCounts.map((item) => [item.listId, item._count.id])
  );

  return lists.map((list) => ({
    ...list,
    viewsCount: viewsCountMap.get(list.id) ?? 0,
    viewerState: {
      isOwner: currentUserId ? list.userId === currentUserId : false,
      isFollowing: currentUserId ? followingIds.has(list.id) : false,
    },
  }));
}

