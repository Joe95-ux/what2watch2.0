import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { moderateContent } from "@/lib/moderation";
import { triggerWatchPartyChatUpdated } from "@/lib/pusher/server";

async function requireUser() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    return { ok: false as const, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const user = await db.user.findUnique({
    where: { clerkId: clerkUserId },
    select: { id: true },
  });
  if (!user) {
    return { ok: false as const, response: NextResponse.json({ error: "User not found" }, { status: 404 }) };
  }
  return { ok: true as const, user };
}

async function requirePartyChatRead(roomId: string, userId: string) {
  const room = await db.watchPartyRoom.findFirst({
    where: { id: roomId },
    select: { id: true, status: true },
  });
  if (!room) return { ok: false as const, response: NextResponse.json({ error: "Party not found" }, { status: 404 }) };
  const row = await db.watchPartyParticipant.findUnique({
    where: { roomId_userId: { roomId, userId } },
    select: { leftAt: true },
  });
  if (!row) {
    return { ok: false as const, response: NextResponse.json({ error: "Join the party to view chat" }, { status: 403 }) };
  }
  if (room.status === "OPEN" && row.leftAt != null) {
    return { ok: false as const, response: NextResponse.json({ error: "Rejoin the party to view chat" }, { status: 403 }) };
  }
  return { ok: true as const, room };
}

async function requireOpenPartyMember(roomId: string, userId: string) {
  const room = await db.watchPartyRoom.findFirst({
    where: { id: roomId },
    select: { id: true, status: true },
  });
  if (!room) return { ok: false as const, response: NextResponse.json({ error: "Party not found" }, { status: 404 }) };
  if (room.status !== "OPEN") {
    return { ok: false as const, response: NextResponse.json({ error: "Party has ended" }, { status: 410 }) };
  }
  const member = await db.watchPartyParticipant.findFirst({
    where: { roomId, userId, leftAt: null },
    select: { id: true },
  });
  if (!member) {
    return { ok: false as const, response: NextResponse.json({ error: "Join the party to use chat" }, { status: 403 }) };
  }
  return { ok: true as const, room };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authResult = await requireUser();
  if (!authResult.ok) return authResult.response;

  const { id: roomId } = await context.params;
  if (!roomId?.trim()) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const gate = await requirePartyChatRead(roomId, authResult.user.id);
  if (!gate.ok) return gate.response;

  const rows = await db.watchPartyMessage.findMany({
    where: { roomId },
    orderBy: { createdAt: "desc" },
    take: 80,
    include: {
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  const messages = [...rows].reverse().map((m) => ({
    id: m.id,
    content: m.content,
    createdAt: m.createdAt.toISOString(),
    user: {
      id: m.user.id,
      name: m.user.displayName || m.user.username || "Unknown",
      avatarUrl: m.user.avatarUrl,
    },
  }));

  return NextResponse.json({ messages });
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authResult = await requireUser();
  if (!authResult.ok) return authResult.response;

  const { id: roomId } = await context.params;
  if (!roomId?.trim()) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const gate = await requireOpenPartyMember(roomId, authResult.user.id);
  if (!gate.ok) return gate.response;

  let body: { content?: string };
  try {
    body = (await request.json()) as { content?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const moderation = moderateContent(body.content ?? "", {
    minLength: 1,
    maxLength: 500,
    allowProfanity: false,
    sanitizeHtml: true,
  });
  if (!moderation.allowed || !moderation.sanitized) {
    return NextResponse.json({ error: moderation.error || "Invalid message" }, { status: 400 });
  }

  const created = await db.watchPartyMessage.create({
    data: {
      roomId,
      userId: authResult.user.id,
      content: moderation.sanitized,
    },
    include: {
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  await triggerWatchPartyChatUpdated(roomId, { action: "message", messageId: created.id });

  return NextResponse.json({
    message: {
      id: created.id,
      content: created.content,
      createdAt: created.createdAt.toISOString(),
      user: {
        id: created.user.id,
        name: created.user.displayName || created.user.username || "Unknown",
        avatarUrl: created.user.avatarUrl,
      },
    },
  });
}
