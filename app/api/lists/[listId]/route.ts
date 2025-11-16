import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET - Fetch a specific list
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
): Promise<NextResponse<{ list: unknown } | { error: string }>> {
  try {
    const { userId: clerkUserId } = await auth();
    const { listId } = await params;

    const user = clerkUserId ? await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    }) : null;

    const list = await db.list.findUnique({
      where: { id: listId },
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

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    // Check visibility
    if (list.visibility === "PRIVATE" && (!user || list.userId !== user.id)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (list.visibility === "FOLLOWERS_ONLY" && user) {
      const isFollowing = await db.follow.findUnique({
        where: {
          followerId_followingId: {
            followerId: user.id,
            followingId: list.userId,
          },
        },
      });
      if (!isFollowing && list.userId !== user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    }

    return NextResponse.json({ 
      list,
      currentUserId: user?.id || null,
    });
  } catch (error) {
    console.error("Get list API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch list";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// PATCH - Update a list
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
): Promise<NextResponse<{ success: boolean; list?: unknown } | { error: string }>> {
  try {
    const { userId: clerkUserId } = await auth();
    const { listId } = await params;

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

    const list = await db.list.findUnique({
      where: { id: listId },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    if (list.userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, visibility, tags, items } = body;

    // Parse tags if provided
    let tagsArray: string[] | undefined = undefined;
    if (tags !== undefined) {
      if (typeof tags === "string") {
        tagsArray = tags.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0);
      } else if (Array.isArray(tags)) {
        tagsArray = tags.filter(tag => typeof tag === "string" && tag.trim().length > 0);
      }
    }

    // Update list
    const updateData: {
      name?: string;
      description?: string | null;
      visibility?: "PUBLIC" | "FOLLOWERS_ONLY" | "PRIVATE";
      tags?: string[];
    } = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (visibility !== undefined && (visibility === "PUBLIC" || visibility === "FOLLOWERS_ONLY" || visibility === "PRIVATE")) {
      updateData.visibility = visibility;
    }
    if (tagsArray !== undefined) updateData.tags = tagsArray;

    // Update items if provided
    if (items !== undefined) {
      // Delete existing items
      await db.listItem.deleteMany({
        where: { listId },
      });

      // Create new items
      if (Array.isArray(items) && items.length > 0) {
        await db.listItem.createMany({
          data: items.map((item: {
            tmdbId: number;
            mediaType: "movie" | "tv";
            title: string;
            posterPath?: string | null;
            backdropPath?: string | null;
            releaseDate?: string | null;
            firstAirDate?: string | null;
            position?: number;
          }, index: number) => ({
            listId,
            tmdbId: item.tmdbId,
            mediaType: item.mediaType,
            title: item.title,
            posterPath: item.posterPath || null,
            backdropPath: item.backdropPath || null,
            releaseDate: item.releaseDate || null,
            firstAirDate: item.firstAirDate || null,
            position: item.position !== undefined ? item.position : index + 1,
          })),
        });
      }
    }

    const updatedList = await db.list.update({
      where: { id: listId },
      data: updateData,
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

    return NextResponse.json({ success: true, list: updatedList });
  } catch (error) {
    console.error("Update list API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update list";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE - Delete a list
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
): Promise<NextResponse<{ success: boolean } | { error: string }>> {
  try {
    const { userId: clerkUserId } = await auth();
    const { listId } = await params;

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

    const list = await db.list.findUnique({
      where: { id: listId },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    if (list.userId !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    await db.list.delete({
      where: { id: listId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete list API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to delete list";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

