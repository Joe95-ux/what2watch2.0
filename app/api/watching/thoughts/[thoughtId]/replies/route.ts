import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { moderateContent } from "@/lib/moderation";
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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ thoughtId: string }> }
): Promise<NextResponse<{ replies: unknown[] } | { error: string }>> {
  try {
    const { thoughtId } = await params;
    const replies = await db.watchingThoughtReply.findMany({
      where: { thoughtId },
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
      orderBy: { createdAt: "asc" },
      take: 50,
    });
    return NextResponse.json({ replies });
  } catch (error) {
    console.error("watching thought replies GET error:", error);
    return NextResponse.json({ error: "Failed to fetch replies" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ thoughtId: string }> }
): Promise<NextResponse<{ success: boolean; reply?: unknown } | { error: string }>> {
  try {
    const authResult = await requireUserId();
    if (isRequireUserIdFailure(authResult)) return authResult.response;

    const { thoughtId } = await params;
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

    const thought = await db.watchingThought.findUnique({
      where: { id: thoughtId },
      select: {
        id: true,
        userId: true,
        session: { select: { tmdbId: true, mediaType: true, title: true } },
      },
    });
    if (!thought) return NextResponse.json({ error: "Thought not found" }, { status: 404 });

    const reply = await db.watchingThoughtReply.create({
      data: {
        thoughtId,
        userId: authResult.userId,
        content: moderation.sanitized || content,
      },
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
    await triggerWatchingTitleUpdated(thought.session.mediaType as "movie" | "tv", thought.session.tmdbId, {
      action: "thought_replied",
      thoughtId,
      actorId: authResult.userId,
    });

    if (thought.userId !== authResult.userId) {
      const actor = await db.user.findUnique({
        where: { id: authResult.userId },
        select: { username: true, displayName: true },
      });
      const actorName = actor?.displayName || actor?.username || "Someone";
      await db.generalNotification.create({
        data: {
          userId: thought.userId,
          type: "ACTIVITY_LIKED",
          title: "New reply on your thought",
          message: `${actorName} replied to your thought on ${thought.session.title}`,
          linkUrl: "/dashboard/watching",
          metadata: {
            thoughtId,
            replyId: reply.id,
            actorId: authResult.userId,
            tmdbId: thought.session.tmdbId,
            mediaType: thought.session.mediaType,
          },
        },
      });
      await triggerUserNotificationsChanged([thought.userId], "general", {
        source: "watching-thought-reply",
        thoughtId,
      });
      await publishUserNotification({
        userIds: [thought.userId],
        title: "New reply on your thought",
        body: `${actorName} replied to your thought on ${thought.session.title}`,
        linkUrl: "/dashboard/watching",
        data: { thoughtId, replyId: reply.id },
      });
    }
    return NextResponse.json({ success: true, reply });
  } catch (error) {
    console.error("watching thought replies POST error:", error);
    return NextResponse.json({ error: "Failed to create reply" }, { status: 500 });
  }
}

