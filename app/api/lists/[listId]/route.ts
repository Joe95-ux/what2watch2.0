import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  EDITORIAL_TAG,
  buildRelatedMetadataTags,
  keepSystemListTags,
  stripSystemListTags,
} from "@/lib/list-related-metadata";
import { notifyPaidUsersEditorialListPublished } from "@/lib/editorial-list-notifications";

function hasEditorialPrivileges(user: {
  role?: string | null;
  isForumAdmin?: boolean | null;
}) {
  const role = (user.role ?? "").toUpperCase();
  return role === "ADMIN" || role === "SUPER_ADMIN" || role === "EDITOR" || user.isForumAdmin === true;
}

function mapListForClient<T extends { tags?: string[] }>(list: T) {
  const tags = list.tags ?? [];
  const isEditorial = tags.includes(EDITORIAL_TAG);
  return {
    ...list,
    tags: stripSystemListTags(tags),
    isEditorial,
  };
}

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
        _count: {
          select: {
            items: true,
            likedBy: true,
            comments: true,
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

    const viewsCount = await db.listEngagementEvent.count({
      where: { listId, type: "VISIT" },
    });

    return NextResponse.json({
      list: { ...mapListForClient(list), viewsCount },
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
      select: {
        id: true,
        role: true,
        isForumAdmin: true,
      },
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
    const { name, description, visibility, tags, items, isEditorial } = body;

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
    if (tagsArray !== undefined) {
      const systemTags = keepSystemListTags(list.tags ?? []);
      updateData.tags = [...stripSystemListTags(tagsArray), ...systemTags];
    }

    if (isEditorial !== undefined) {
      if (!hasEditorialPrivileges(user)) {
        return NextResponse.json({ error: "Forbidden: Editorial privileges required" }, { status: 403 });
      }
      const effectiveTags = [...(updateData.tags ?? list.tags ?? [])].filter((tag) => tag !== EDITORIAL_TAG);
      if (isEditorial === true) {
        effectiveTags.push(EDITORIAL_TAG);
      }
      updateData.tags = effectiveTags;
    }

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

      const metadataTags = await buildRelatedMetadataTags(
        (Array.isArray(items) ? items : []).map((item: {
          tmdbId: number;
          mediaType: "movie" | "tv";
        }) => ({
          tmdbId: item.tmdbId,
          mediaType: item.mediaType,
        })),
      );

      const currentTags = updateData.tags ?? list.tags ?? [];
      const isEditorialEffective = currentTags.includes(EDITORIAL_TAG);
      updateData.tags = [
        ...stripSystemListTags(currentTags),
        ...metadataTags,
        ...(isEditorialEffective ? [EDITORIAL_TAG] : []),
      ];
    }

    const wasPublishedEditorialList =
      (list.tags ?? []).includes(EDITORIAL_TAG) && list.visibility === "PUBLIC";

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

    const isPublishedEditorialList =
      (updatedList.tags ?? []).includes(EDITORIAL_TAG) &&
      updatedList.visibility === "PUBLIC";
    if (!wasPublishedEditorialList && isPublishedEditorialList) {
      await notifyPaidUsersEditorialListPublished({
        listId: updatedList.id,
        listName: updatedList.name,
        actorUserId: user.id,
      });
    }

    return NextResponse.json({ success: true, list: mapListForClient(updatedList) });
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

    const userWithRole = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true, role: true, isForumAdmin: true },
    });

    if (!userWithRole) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const list = await db.list.findUnique({
      where: { id: listId },
      select: { id: true, userId: true, tags: true },
    });

    if (!list) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    const isEditorial = (list.tags ?? []).includes(EDITORIAL_TAG);
    const isOwner = list.userId === userWithRole.id;
    const canDeleteAsEditor = isEditorial && hasEditorialPrivileges(userWithRole);

    if (!isOwner && !canDeleteAsEditor) {
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

