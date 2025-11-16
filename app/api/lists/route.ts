import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET - Fetch user's lists
export async function GET(request: NextRequest): Promise<NextResponse<{ lists: unknown[] } | { error: string }>> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const visibilityParam = searchParams.get("visibility"); // Filter by visibility

    // Build where clause
    const where: {
      userId: string;
      visibility?: "PUBLIC" | "FOLLOWERS_ONLY" | "PRIVATE";
    } = {
      userId: user.id,
    };

    if (visibilityParam === "PUBLIC" || visibilityParam === "FOLLOWERS_ONLY" || visibilityParam === "PRIVATE") {
      where.visibility = visibilityParam;
    }

    // Fetch lists with items
    const lists = await db.list.findMany({
      where,
      include: {
        items: {
          orderBy: { position: "asc" },
        },
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ lists });
  } catch (error) {
    console.error("Lists API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch lists";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// POST - Create a new list
export async function POST(request: NextRequest): Promise<NextResponse<{ success: boolean; list?: unknown } | { error: string }>> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, visibility, tags, items } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "List name is required" },
        { status: 400 }
      );
    }

    // Parse tags
    let tagsArray: string[] = [];
    if (tags) {
      if (typeof tags === "string") {
        tagsArray = tags.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0);
      } else if (Array.isArray(tags)) {
        tagsArray = tags.filter(tag => typeof tag === "string" && tag.trim().length > 0);
      }
    }

    // Create list with items in a transaction
    const list = await db.list.create({
      data: {
        userId: user.id,
        name: name.trim(),
        description: description?.trim() || null,
        visibility: visibility || "PUBLIC",
        tags: tagsArray,
        items: {
          create: (items || []).map((item: {
            tmdbId: number;
            mediaType: "movie" | "tv";
            title: string;
            posterPath?: string | null;
            backdropPath?: string | null;
            releaseDate?: string | null;
            firstAirDate?: string | null;
            position?: number;
          }, index: number) => ({
            tmdbId: item.tmdbId,
            mediaType: item.mediaType,
            title: item.title,
            posterPath: item.posterPath || null,
            backdropPath: item.backdropPath || null,
            releaseDate: item.releaseDate || null,
            firstAirDate: item.firstAirDate || null,
            position: item.position !== undefined ? item.position : index + 1,
          })),
        },
      },
      include: {
        items: {
          orderBy: { position: "asc" },
        },
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Create activity for creating list
    try {
      await db.activity.create({
        data: {
          userId: user.id,
          type: "CREATED_LIST",
          listId: list.id,
          listName: list.name,
        },
      });
    } catch (error) {
      // Silently fail - activity creation is not critical
      console.error("Failed to create activity:", error);
    }

    return NextResponse.json({ success: true, list });
  } catch (error) {
    console.error("Create list API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create list";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

