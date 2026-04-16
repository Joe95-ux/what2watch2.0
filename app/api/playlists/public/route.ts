import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { stripSystemListTags, toGenreTag, toItemTag } from "@/lib/list-related-metadata";

function mapPlaylistForClient<T extends { tags?: string[] }>(playlist: T) {
  return {
    ...playlist,
    tags: stripSystemListTags(playlist.tags ?? []),
  };
}

const publicPlaylistBase: Prisma.PlaylistWhereInput = {
  OR: [{ visibility: "PUBLIC" }, { isPublic: true }],
  items: {
    some: {},
  },
};


// GET - Fetch public playlists (no authentication required)
export async function GET(
  request: NextRequest,
): Promise<NextResponse<{ playlists: unknown[]; currentUserId?: string } | { error: string }>> {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit");
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const relatedTmdbId = searchParams.get("tmdbId");
    const relatedMediaType = searchParams.get("mediaType");
    const relatedTmdbIdNum = relatedTmdbId ? parseInt(relatedTmdbId, 10) : null;
    const genreIdsParam = searchParams.get("genreIds");
    const genreIds = genreIdsParam
      ? genreIdsParam
          .split(",")
          .map((x) => parseInt(x, 10))
          .filter((x) => !Number.isNaN(x))
      : [];

    const { userId: clerkUserId } = await auth();
    let currentUserId: string | undefined;
    if (clerkUserId) {
      const user = await db.user.findUnique({
        where: { clerkId: clerkUserId },
        select: { id: true },
      });
      currentUserId = user?.id;
    }

    const where: Prisma.PlaylistWhereInput = { ...publicPlaylistBase };

    const hasExactTarget =
      relatedTmdbIdNum !== null &&
      !Number.isNaN(relatedTmdbIdNum) &&
      (relatedMediaType === "movie" || relatedMediaType === "tv");

    const exactItemTag = hasExactTarget
      ? toItemTag(relatedMediaType as "movie" | "tv", relatedTmdbIdNum as number)
      : null;
    const genreTags = genreIds.map((id) => toGenreTag(id));

    if (hasExactTarget || genreTags.length > 0) {
      const relatedTagFilters: Prisma.PlaylistWhereInput[] = [];
      if (exactItemTag) {
        relatedTagFilters.push({ tags: { has: exactItemTag } });
      }
      if (genreTags.length > 0) {
        relatedTagFilters.push({ tags: { hasSome: genreTags } });
      }
      where.AND = [{ OR: relatedTagFilters }];
    }

    let playlists = await db.playlist.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        items: {
          take: 12,
          orderBy: { order: "asc" },
          select: {
            order: true,
            posterPath: true,
            tmdbId: true,
            mediaType: true,
          },
        },
        youtubeItems: {
          take: 3,
          orderBy: { order: "asc" },
          select: {
            order: true,
            thumbnail: true,
          },
        },
        _count: {
          select: {
            items: true,
            youtubeItems: true,
            likedBy: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: hasExactTarget || genreTags.length > 0 ? Math.max(limitNum * 2, 20) : limitNum,
    });

    if ((hasExactTarget || genreTags.length > 0) && playlists.length === 0) {
      playlists = await db.playlist.findMany({
        where: publicPlaylistBase,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          items: {
            take: 12,
            orderBy: { order: "asc" },
            select: {
              order: true,
              posterPath: true,
              tmdbId: true,
              mediaType: true,
            },
          },
          youtubeItems: {
            take: 3,
            orderBy: { order: "asc" },
            select: {
              order: true,
              thumbnail: true,
            },
          },
          _count: {
            select: {
              items: true,
              youtubeItems: true,
              likedBy: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: limitNum,
      });
    }

    const mapped = playlists.map(mapPlaylistForClient);

    const relatedMode = hasExactTarget || genreTags.length > 0;

    const headers: Record<string, string> = relatedMode
      ? {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        }
      : {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        };

    return NextResponse.json({ playlists: mapped.slice(0, limitNum), currentUserId }, { headers });
  } catch (error) {
    console.error("Get public playlists API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch public playlists";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
