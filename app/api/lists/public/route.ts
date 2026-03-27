import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  EDITORIAL_TAG,
  stripSystemListTags,
  toGenreTag,
  toItemTag,
} from "@/lib/list-related-metadata";

function mapListForClient<T extends { tags?: string[] }>(list: T) {
  const tags = list.tags ?? [];
  const isEditorial = tags.includes(EDITORIAL_TAG);
  return {
    ...list,
    tags: stripSystemListTags(tags),
    isEditorial,
  };
}

// GET - Fetch public lists (no authentication required)
export async function GET(request: NextRequest): Promise<NextResponse<{ lists: unknown[]; currentUserId?: string } | { error: string }>> {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit");
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const editorialOnlyParam = searchParams.get("editorialOnly");
    const relatedTmdbId = searchParams.get("tmdbId");
    const relatedMediaType = searchParams.get("mediaType");
    const relatedTmdbIdNum = relatedTmdbId ? parseInt(relatedTmdbId, 10) : null;
    const genreIdsParam = searchParams.get("genreIds");
    const debugMode = searchParams.get("debug") === "1";
    const genreIds = genreIdsParam
      ? genreIdsParam
          .split(",")
          .map((x) => parseInt(x, 10))
          .filter((x) => !Number.isNaN(x))
      : [];

    // Get current user if authenticated (for ownership checks)
    const { userId: clerkUserId } = await auth();
    let currentUserId: string | undefined;
    if (clerkUserId) {
      const user = await db.user.findUnique({
        where: { clerkId: clerkUserId },
        select: { id: true },
      });
      currentUserId = user?.id;
    }

    // Fetch public lists, ordered by most recently updated
    // Only include lists that have at least one item
    const where: any = {
      visibility: "PUBLIC",
      items: {
        some: {}, // At least one item
      },
    };

    if (editorialOnlyParam === "true") {
      where.tags = { has: EDITORIAL_TAG };
    } else if (editorialOnlyParam === "false") {
      where.tags = { hasNone: [EDITORIAL_TAG] };
    }

    const hasExactTarget =
      relatedTmdbIdNum &&
      !Number.isNaN(relatedTmdbIdNum) &&
      (relatedMediaType === "movie" || relatedMediaType === "tv");

    const exactItemTag = hasExactTarget
      ? toItemTag(relatedMediaType as "movie" | "tv", relatedTmdbIdNum as number)
      : null;
    const genreTags = genreIds.map((id) => toGenreTag(id));

    if (hasExactTarget || genreTags.length > 0) {
      const relatedTagFilters: Array<Record<string, unknown>> = [];
      if (exactItemTag) {
        relatedTagFilters.push({ tags: { has: exactItemTag } });
      }
      if (genreTags.length > 0) {
        relatedTagFilters.push({ tags: { hasSome: genreTags } });
      }
      where.AND = [{ OR: relatedTagFilters }];
    }

    const debug: {
      input: Record<string, unknown>;
      derived: Record<string, unknown>;
      whereBeforeQuery: Record<string, unknown>;
      result?: Record<string, unknown>;
      samples?: Record<string, unknown>;
      fallback?: Record<string, unknown>;
    } | null = debugMode
      ? {
          input: {
            limitNum,
            editorialOnlyParam,
            relatedTmdbId,
            relatedMediaType,
            genreIds,
            currentUserId: currentUserId ?? null,
          },
          derived: {
            hasExactTarget,
            exactItemTag,
            genreTags,
          },
          whereBeforeQuery: where,
        }
      : null;

    let lists = await db.list.findMany({
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
          orderBy: { position: "asc" },
          select: {
            tmdbId: true,
            mediaType: true,
            position: true,
            posterPath: true,
          },
        },
        _count: {
          select: {
            items: true,
            likedBy: true,
            comments: true,
          },
        },
        likedBy: {
          select: {
            id: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: hasExactTarget || genreTags.length > 0 ? Math.max(limitNum * 2, 20) : limitNum,
    });

    if (debug) {
      debug.result = {
        matchedBeforeFallback: lists.length,
      };
      debug.samples = {
        firstMatchedLists: lists.slice(0, 5).map((list) => ({
          id: list.id,
          name: list.name,
          visibility: list.visibility,
          hasEditorialTag: (list.tags || []).includes(EDITORIAL_TAG),
          itemCount: list._count?.items ?? 0,
          tagsPreview: (list.tags || []).slice(0, 12),
        })),
      };
    }

    if ((hasExactTarget || genreTags.length > 0) && lists.length === 0) {
      const fallbackWhere: Record<string, unknown> = {
        visibility: "PUBLIC",
        tags: { hasNone: [EDITORIAL_TAG] },
        items: { some: {} },
      };

      lists = await db.list.findMany({
        where: fallbackWhere,
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
            orderBy: { position: "asc" },
            select: {
              tmdbId: true,
              mediaType: true,
              position: true,
              posterPath: true,
            },
          },
          _count: {
            select: {
              items: true,
              likedBy: true,
              comments: true,
            },
          },
          likedBy: {
            select: {
              id: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: limitNum,
      });

      if (debug) {
        debug.fallback = {
          used: true,
          fallbackWhere,
          fallbackCount: lists.length,
          fallbackPreview: lists.slice(0, 5).map((list) => ({
            id: list.id,
            name: list.name,
            hasEditorialTag: (list.tags || []).includes(EDITORIAL_TAG),
            tagsPreview: (list.tags || []).slice(0, 12),
          })),
        };
      }
    } else if (debug) {
      debug.fallback = {
        used: false,
      };
    }

    const mappedLists = lists.map(mapListForClient);

    return NextResponse.json(
      {
        lists: mappedLists.slice(0, limitNum),
        currentUserId,
        ...(debugMode ? { debug } : {}),
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      },
    );
  } catch (error) {
    console.error("Get public lists API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch public lists";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

