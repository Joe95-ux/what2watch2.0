import { NextRequest, NextResponse } from "next/server";
import { requireModerator } from "@/lib/admin-auth";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ postId: string }>;
}

// PATCH - Moderate post (hide, lock, delete)
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const moderator = await requireModerator();
    const { postId } = await params;
    const body = await request.json();
    const { action, reason } = body; // action: "hide" | "unhide" | "lock" | "unlock" | "delete"

    const post = await db.forumPost.findUnique({
      where: { id: postId },
      select: { id: true, userId: true },
    });

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    let updateData: any = {};
    let actionType = "";

    switch (action) {
      case "hide":
        updateData = {
          isHidden: true,
          hiddenAt: new Date(),
          hiddenById: moderator.id,
        };
        actionType = "HIDE_POST";
        break;

      case "unhide":
        updateData = {
          isHidden: false,
          hiddenAt: null,
          hiddenById: null,
        };
        actionType = "UNHIDE_POST";
        break;

      case "lock":
        updateData = {
          isLocked: true,
          lockedAt: new Date(),
          lockedById: moderator.id,
        };
        actionType = "LOCK_POST";
        break;

      case "unlock":
        updateData = {
          isLocked: false,
          lockedAt: null,
          lockedById: null,
        };
        actionType = "UNLOCK_POST";
        break;

      case "delete":
        // Delete the post
        await db.forumPost.delete({
          where: { id: postId },
        });

        // Log action
        await db.forumModerationAction.create({
          data: {
            moderatorId: moderator.id,
            actionType: "DELETE_POST",
            targetType: "POST",
            targetId: postId,
            reason: reason || null,
          },
        });

        return NextResponse.json({ success: true, deleted: true });
      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }

    await db.forumPost.update({
      where: { id: postId },
      data: updateData,
    });

    // Log moderation action
    await db.forumModerationAction.create({
      data: {
        moderatorId: moderator.id,
        actionType: actionType,
        targetType: "POST",
        targetId: postId,
        reason: reason || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error moderating post:", error);
    return NextResponse.json(
      { error: "Failed to moderate post" },
      { status: 500 }
    );
  }
}

