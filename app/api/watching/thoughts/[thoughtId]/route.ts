import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { moderateWatchingThoughtContent } from "@/lib/moderation";
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
  { params }: { params: Promise<{ thoughtId: string }> }
): Promise<NextResponse<{ success: boolean; thought?: unknown } | { error: string }>> {
  try {
    const authResult = await requireUserId();
    if (isRequireUserIdFailure(authResult)) return authResult.response;

    const { thoughtId } = await params;
    const body = await request.json();
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    if (!content) return NextResponse.json({ error: "Thought content is required" }, { status: 400 });

    const moderation = moderateWatchingThoughtContent(content);
    if (!moderation.allowed) {
      return NextResponse.json({ error: moderation.error || "Thought does not meet content guidelines." }, { status: 400 });
    }

    const thought = await db.watchingThought.findUnique({
      where: { id: thoughtId },
      select: {
        id: true,
        userId: true,
        session: { select: { userId: true, tmdbId: true, mediaType: true } },
      },
    });
    if (!thought) return NextResponse.json({ error: "Thought not found" }, { status: 404 });
    if (thought.userId !== authResult.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updatedThought = await db.watchingThought.update({
      where: { id: thoughtId },
      data: { content: moderation.sanitized || content },
      include: {
        user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
      },
    });

    await triggerWatchingDashboardUpdated();
    await triggerWatchingTitleUpdated(thought.session.mediaType as "movie" | "tv", thought.session.tmdbId, {
      action: "thought_updated",
      thoughtId,
      actorId: authResult.userId,
    });

    return NextResponse.json({ success: true, thought: updatedThought });
  } catch (error) {
    console.error("watching thought PATCH error:", error);
    return NextResponse.json({ error: "Failed to update thought" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ thoughtId: string }> }
): Promise<NextResponse<{ success: boolean } | { error: string }>> {
  try {
    const authResult = await requireUserId();
    if (isRequireUserIdFailure(authResult)) return authResult.response;

    const { thoughtId } = await params;
    const thought = await db.watchingThought.findUnique({
      where: { id: thoughtId },
      select: {
        id: true,
        userId: true,
        session: { select: { userId: true, tmdbId: true, mediaType: true } },
      },
    });
    if (!thought) return NextResponse.json({ error: "Thought not found" }, { status: 404 });
    if (thought.userId !== authResult.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.$transaction(async (tx) => {
      const queue = [thoughtId];
      const allReplyIds: string[] = [];
      while (queue.length) {
        const parentIds = [...queue];
        queue.length = 0;
        const children = await tx.watchingThoughtReply.findMany({
          where: { parentReplyId: { in: parentIds } },
          select: { id: true },
        });
        for (const child of children) {
          allReplyIds.push(child.id);
          queue.push(child.id);
        }
      }

      const replyIds = [
        ...(
          await tx.watchingThoughtReply.findMany({
            where: { thoughtId },
            select: { id: true },
          })
        ).map((reply) => reply.id),
      ];
      const idsToDelete = Array.from(new Set([...replyIds, ...allReplyIds]));
      if (idsToDelete.length) {
        await tx.watchingThoughtReply.deleteMany({ where: { id: { in: idsToDelete } } });
      }
      await tx.watchingThoughtReaction.deleteMany({ where: { thoughtId } });
      await tx.watchingThought.delete({ where: { id: thoughtId } });
    });

    await triggerWatchingDashboardUpdated();
    await triggerWatchingTitleUpdated(thought.session.mediaType as "movie" | "tv", thought.session.tmdbId, {
      action: "thought_deleted",
      thoughtId,
      actorId: authResult.userId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("watching thought DELETE error:", error);
    return NextResponse.json({ error: "Failed to delete thought" }, { status: 500 });
  }
}

