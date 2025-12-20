/**
 * Service for managing forum post revision history
 * Separated from components for clear concerns
 */

import { db } from "@/lib/db";

export interface PostRevision {
  id: string;
  postId: string;
  title: string;
  content: string;
  tags: string[];
  categoryId: string | null;
  metadata: Record<string, any> | null;
  editedBy: string;
  editedAt: Date;
  editor?: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

/**
 * Save a revision before updating a post
 */
export async function savePostRevision(
  postId: string,
  currentData: {
    title: string;
    content: string;
    tags: string[];
    categoryId: string | null;
    metadata: Record<string, any> | null;
  },
  editedBy: string
): Promise<void> {
  try {
    // Check if this is actually different from the last revision
    const lastRevision = await db.forumPostRevision.findFirst({
      where: { postId },
      orderBy: { editedAt: "desc" },
      select: {
        title: true,
        content: true,
        tags: true,
        categoryId: true,
        metadata: true,
      },
    });

    // Only save if there's a change
    if (lastRevision) {
      const hasChanges =
        lastRevision.title !== currentData.title ||
        lastRevision.content !== currentData.content ||
        JSON.stringify(lastRevision.tags) !== JSON.stringify(currentData.tags) ||
        lastRevision.categoryId !== currentData.categoryId ||
        JSON.stringify(lastRevision.metadata) !== JSON.stringify(currentData.metadata);

      if (!hasChanges) {
        return; // No changes, skip saving revision
      }
    }

    await db.forumPostRevision.create({
      data: {
        postId,
        title: currentData.title,
        content: currentData.content,
        tags: currentData.tags,
        categoryId: currentData.categoryId,
        metadata: currentData.metadata,
        editedBy,
      },
    });
  } catch (error) {
    console.error("Error saving post revision:", error);
    // Don't throw - revision saving shouldn't block post updates
  }
}

/**
 * Get revision history for a post
 */
export async function getPostRevisions(
  postId: string,
  limit: number = 50
): Promise<PostRevision[]> {
  try {
    const revisions = await db.forumPostRevision.findMany({
      where: { postId },
      orderBy: { editedAt: "desc" },
      take: limit,
      include: {
        editor: {
          select: {
            id: true,
            username: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    });

    return revisions.map((rev) => ({
      id: rev.id,
      postId: rev.postId,
      title: rev.title,
      content: rev.content,
      tags: rev.tags,
      categoryId: rev.categoryId,
      metadata: rev.metadata as Record<string, any> | null,
      editedBy: rev.editedBy,
      editedAt: rev.editedAt,
      editor: rev.editor,
    }));
  } catch (error) {
    console.error("Error fetching post revisions:", error);
    return [];
  }
}

