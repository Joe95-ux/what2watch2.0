import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { moderateContent } from "@/lib/moderation";
import {
  triggerWatchingDashboardUpdated,
  triggerWatchingTitleUpdated,
} from "@/lib/pusher/server";

type RequireUserIdResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse<{ error: string }> };

async function requireUserId(): Promise<RequireUserIdResult> {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const user = await db.user.findUnique({ where: { clerkId: clerkUserId }, select: { id: true } });
  if (!user) return { ok: false, response: NextResponse.json({ error: "User not found" }, { status: 404 }) };
  return { ok: true, userId: user.id };
}

function isRequireUserIdFailure(result: RequireUserIdResult): result is Extract<RequireUserIdResult, { ok: false }> {
  return result.ok === false;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ thoughtId: string; replyId: string }> }
): Promise<NextResponse<{ success: boolean; reply?: unknown } | { error: string }>> {
  try {
    const authResult = await requireUserId();
    if (isRequireUserIdFailure(authResult)) return authResult.response;

    const { thoughtId, replyId } = await params;
    const body = await request.json();
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    if (!content) return NextResponse.json({ error: "Reply content is required" }, { status: 400 });

    const moderation = moderateContent(content, {
      minLength: 1,
      maxLength: 1000,
      allowProfanity: false,
      sanitizeHtml: true,
    });
    if (!moderation.allowed) {
      return NextResponse.json({ error: moderation.error || "Reply does not meet content guidelines." }, { status: 400 });
    }

    const existing = await db.watchingThoughtReply.findUnique({
      where: { id: replyId },
      select: {
        id: true,
        thoughtId: true,
        userId: true,
        thought: { select: { session: { select: { tmdbId: true, mediaType: true } } } },
      },
    });
    if (!existing || existing.thoughtId !== thoughtId) {
      return NextResponse.json({ error: "Reply not found" }, { status: 404 });
    }
    if (existing.userId !== authResult.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updatedReply = await db.watchingThoughtReply.update({
      where: { id: replyId },
      data: { content: moderation.sanitized || content },
      include: {
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

    await triggerWatchingDashboardUpdated();
    await triggerWatchingTitleUpdated(existing.thought.session.mediaType as "movie" | "tv", existing.thought.session.tmdbId, {
      action: "thought_reply_updated",
      thoughtId,
      actorId: authResult.userId,
    });

    return NextResponse.json({ success: true, reply: updatedReply });
  } catch (error) {
    console.error("watching thought reply PATCH error:", error);
    return NextResponse.json({ error: "Failed to update reply" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ thoughtId: string; replyId: string }> }
): Promise<NextResponse<{ success: boolean } | { error: string }>> {
  try {
    const authResult = await requireUserId();
    if (isRequireUserIdFailure(authResult)) return authResult.response;

    const { thoughtId, replyId } = await params;
    const existing = await db.watchingThoughtReply.findUnique({
      where: { id: replyId },
      select: {
        id: true,
        thoughtId: true,
        userId: true,
        thought: { select: { session: { select: { tmdbId: true, mediaType: true } } } },
      },
    });
    if (!existing || existing.thoughtId !== thoughtId) {
      return NextResponse.json({ error: "Reply not found" }, { status: 404 });
    }
    if (existing.userId !== authResult.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.$transaction(async (tx) => {
      const idsToDelete = [replyId];
      const queue = [replyId];
      while (queue.length) {
        const parentIds = [...queue];
        queue.length = 0;
        const children = await tx.watchingThoughtReply.findMany({
          where: { parentReplyId: { in: parentIds } },
          select: { id: true },
        });
        for (const child of children) {
          idsToDelete.push(child.id);
          queue.push(child.id);
        }
      }
      await tx.watchingThoughtReply.deleteMany({ where: { id: { in: Array.from(new Set(idsToDelete)) } } });
    });

    await triggerWatchingDashboardUpdated();
    await triggerWatchingTitleUpdated(existing.thought.session.mediaType as "movie" | "tv", existing.thought.session.tmdbId, {
      action: "thought_reply_deleted",
      thoughtId,
      actorId: authResult.userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("watching thought reply DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete reply" }, { status: 500 });
  }
}

