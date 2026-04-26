import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  triggerUserNotificationsChanged,
  triggerWatchingTitleUpdated,
} from "@/lib/pusher/server";
import { publishUserNotification } from "@/lib/pusher/beams-server";

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ thoughtId: string }> }
): Promise<NextResponse<{ success: boolean } | { error: string }>> {
  try {
    const authResult = await requireUserId();
    if (isRequireUserIdFailure(authResult)) return authResult.response;
    const { thoughtId } = await params;
    const body = await request.json();
    const reactionType = typeof body?.reactionType === "string" ? body.reactionType.trim() : "";
    const isValidEmoji = /^[\p{Emoji}]$/u.test(reactionType);
    if (reactionType !== "like" && !isValidEmoji) {
      return NextResponse.json({ error: "Invalid reaction type" }, { status: 400 });
    }

    const thought = await db.watchingThought.findUnique({
      where: { id: thoughtId },
      select: {
        id: true,
        userId: true,
        session: { select: { tmdbId: true, mediaType: true, title: true } },
      },
    });
    if (!thought) return NextResponse.json({ error: "Thought not found" }, { status: 404 });

    const existing = await db.watchingThoughtReaction.findUnique({
      where: {
        thoughtId_userId_reactionType: {
          thoughtId,
          userId: authResult.userId,
          reactionType,
        },
      },
      select: { id: true },
    });

    // Enforce single reaction per user per thought.
    // If user chooses a new reaction, replace their previous one.
    const existingAnyReaction = await db.watchingThoughtReaction.findFirst({
      where: {
        thoughtId,
        userId: authResult.userId,
      },
      select: { id: true, reactionType: true },
    });

    if (!existing) {
      if (existingAnyReaction) {
        await db.watchingThoughtReaction.delete({ where: { id: existingAnyReaction.id } });
      }
      await db.watchingThoughtReaction.create({
        data: {
          thoughtId,
          userId: authResult.userId,
          reactionType,
        },
      });
    }

    await triggerWatchingTitleUpdated(thought.session.mediaType as "movie" | "tv", thought.session.tmdbId, {
      action: "thought_reacted",
      thoughtId,
      actorId: authResult.userId,
    });

    if (!existing && thought.userId !== authResult.userId) {
      const actor = await db.user.findUnique({
        where: { id: authResult.userId },
        select: { username: true, displayName: true },
      });
      const actorName = actor?.displayName || actor?.username || "Someone";
      const title = thought.session.title;
      await db.generalNotification.create({
        data: {
          userId: thought.userId,
          type: "ACTIVITY_LIKED",
          title: "New reaction on your thought",
          message: `${actorName} reacted to your thought on ${title}`,
          linkUrl: "/dashboard/watching",
          metadata: {
            thoughtId,
            actorId: authResult.userId,
            tmdbId: thought.session.tmdbId,
            mediaType: thought.session.mediaType,
          },
        },
      });
      await triggerUserNotificationsChanged([thought.userId], "general", {
        source: "watching-thought-reaction",
        thoughtId,
      });
      await publishUserNotification({
        userIds: [thought.userId],
        title: "New reaction on your thought",
        body: `${actorName} reacted to your thought on ${title}`,
        linkUrl: "/dashboard/watching",
        data: { thoughtId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("watching thought reaction POST error:", error);
    return NextResponse.json({ error: "Failed to add reaction" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ thoughtId: string }> }
): Promise<NextResponse<{ success: boolean } | { error: string }>> {
  try {
    const authResult = await requireUserId();
    if (isRequireUserIdFailure(authResult)) return authResult.response;
    const { thoughtId } = await params;
    const reactionType = new URL(request.url).searchParams.get("reactionType");
    if (!reactionType) return NextResponse.json({ error: "Reaction type is required" }, { status: 400 });

    const existing = await db.watchingThoughtReaction.findUnique({
      where: {
        thoughtId_userId_reactionType: {
          thoughtId,
          userId: authResult.userId,
          reactionType,
        },
      },
      select: { id: true },
    });
    if (!existing) return NextResponse.json({ error: "Reaction not found" }, { status: 404 });

    await db.watchingThoughtReaction.delete({ where: { id: existing.id } });
    const thought = await db.watchingThought.findUnique({
      where: { id: thoughtId },
      select: { session: { select: { tmdbId: true, mediaType: true } } },
    });
    if (thought) {
      await triggerWatchingTitleUpdated(thought.session.mediaType as "movie" | "tv", thought.session.tmdbId, {
        action: "thought_reaction_removed",
        thoughtId,
        actorId: authResult.userId,
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("watching thought reaction DELETE error:", error);
    return NextResponse.json({ error: "Failed to remove reaction" }, { status: 500 });
  }
}

