import { NextRequest, NextResponse } from "next/server";
import { requireModerator } from "@/lib/admin-auth";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ replyId: string }>;
}

// PATCH - Moderate reply (hide, delete)
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const moderator = await requireModerator();
    const { replyId } = await params;
    const body = await request.json();
    const { action, reason } = body; // action: "hide" | "unhide" | "delete"

    const reply = await db.forumReply.findUnique({
      where: { id: replyId },
      select: { id: true },
    });

    if (!reply) {
      return NextResponse.json({ error: "Reply not found" }, { status: 404 });
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
        actionType = "HIDE_REPLY";
        break;

      case "unhide":
        updateData = {
          isHidden: false,
          hiddenAt: null,
          hiddenById: null,
        };
        actionType = "UNHIDE_REPLY";
        break;

      case "delete":
        // Delete the reply
        await db.forumReply.delete({
          where: { id: replyId },
        });

        // Log action
        await db.forumModerationAction.create({
          data: {
            moderatorId: moderator.id,
            actionType: "DELETE_REPLY",
            targetType: "REPLY",
            targetId: replyId,
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

    await db.forumReply.update({
      where: { id: replyId },
      data: updateData,
    });

    // Log moderation action
    await db.forumModerationAction.create({
      data: {
        moderatorId: moderator.id,
        actionType: actionType,
        targetType: "REPLY",
        targetId: replyId,
        reason: reason || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error moderating reply:", error);
    return NextResponse.json(
      { error: "Failed to moderate reply" },
      { status: 500 }
    );
  }
}

