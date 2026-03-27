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

const listInclude = {
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
    orderBy: { position: "asc" as const },
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
};

// GET - Fetch public lists (no authentication required)
export async function GET(
  request: NextRequest,
): Promise<
  NextResponse<
    | {
        lists: unknown[];
        currentUserId?: string;
        total?: number;
        page?: number;
        limit?: number;
      }
    | { error: string }
  >
> {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get("limit");
    const limitNum = limit ? parseInt(limit, 10) : 20;
    const editorialOnlyParam = searchParams.get("editorialOnly");
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

    const pageRaw = searchParams.get("page");
    const pageNum = pageRaw ? Math.max(1, parseInt(pageRaw, 10) || 1) : 1;
    const skip = (pageNum - 1) * limitNum;
    const q = searchParams.get("q")?.trim();
    const sortByParam = searchParams.get("sortBy") || "updatedAt";
    const sortBy =
      sortByParam === "name"
        ? "name"
        : sortByParam === "createdAt"
          ? "createdAt"
          : "updatedAt";
    const sortOrder = searchParams.get("order") === "asc" ? ("asc" as const) : ("desc" as const);

    const { userId: clerkUserId } = await auth();
    let currentUserId: string | undefined;
    if (clerkUserId) {
      const user = await db.user.findUnique({
        where: { clerkId: clerkUserId },
        select: { id: true },
      });
      currentUserId = user?.id;
    }

    const hasExactTarget =
      relatedTmdbIdNum !== null &&
      !Number.isNaN(relatedTmdbIdNum) &&
      (relatedMediaType === "movie" || relatedMediaType === "tv");

    const exactItemTag = hasExactTarget
      ? toItemTag(relatedMediaType as "movie" | "tv", relatedTmdbIdNum as number)
      : null;
    const genreTags = genreIds.map((id) => toGenreTag(id));
    const hasRelatedFilters = Boolean(hasExactTarget || genreTags.length > 0);

    // Related lists (details overview): tag-based match + optional fallback — no paginated catalog
    if (hasRelatedFilters) {
      const where: Record<string, unknown> = {
        visibility: "PUBLIC",
        items: {
          some: {},
        },
      };

      if (editorialOnlyParam === "true") {
        where.tags = { has: EDITORIAL_TAG };
      } else if (editorialOnlyParam === "false") {
        where.NOT = [{ tags: { has: EDITORIAL_TAG } }];
      }

      const relatedTagFilters: Array<Record<string, unknown>> = [];
      if (exactItemTag) {
        relatedTagFilters.push({ tags: { has: exactItemTag } });
      }
      if (genreTags.length > 0) {
        relatedTagFilters.push({ tags: { hasSome: genreTags } });
      }
      where.AND = [{ OR: relatedTagFilters }];

      let lists = await db.list.findMany({
        where,
        include: listInclude,
        orderBy: { updatedAt: "desc" },
        take: Math.max(limitNum * 2, 20),
      });

      if (lists.length === 0) {
        const fallbackWhere: Record<string, unknown> = {
          visibility: "PUBLIC",
          NOT: [{ tags: { has: EDITORIAL_TAG } }],
          items: { some: {} },
        };

        lists = await db.list.findMany({
          where: fallbackWhere,
          include: listInclude,
          orderBy: { updatedAt: "desc" },
          take: limitNum,
        });
      }

      const mappedLists = lists.map(mapListForClient);

      return NextResponse.json(
        { lists: mappedLists.slice(0, limitNum), currentUserId },
        {
          headers: {
            "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        },
      );
    }

    // Catalog mode (lists browser, editorial page): pagination, search, sort
    const whereAnd: Array<Record<string, unknown>> = [
      { visibility: "PUBLIC" },
      { items: { some: {} } },
    ];

    if (editorialOnlyParam === "true") {
      whereAnd.push({ tags: { has: EDITORIAL_TAG } });
    } else if (editorialOnlyParam === "false") {
      whereAnd.push({ NOT: [{ tags: { has: EDITORIAL_TAG } }] });
    }

    if (q) {
      whereAnd.push({ name: { contains: q, mode: "insensitive" } });
    }

    const whereCatalog = { AND: whereAnd };

    const total = await db.list.count({ where: whereCatalog });

    const orderBy =
      sortBy === "name"
        ? { name: sortOrder }
        : sortBy === "createdAt"
          ? { createdAt: sortOrder }
          : { updatedAt: sortOrder };

    const lists = await db.list.findMany({
      where: whereCatalog,
      include: listInclude,
      orderBy,
      skip,
      take: limitNum,
    });

    const mappedLists = lists.map(mapListForClient);

    return NextResponse.json(
      {
        lists: mappedLists,
        currentUserId,
        total,
        page: pageNum,
        limit: limitNum,
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
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
