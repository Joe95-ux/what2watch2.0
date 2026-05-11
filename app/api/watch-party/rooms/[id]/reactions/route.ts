import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  isWatchPartyReactionKind,
  WATCH_PARTY_REACTION_KINDS,
  type WatchPartyReactionKind,
} from "@/lib/watch-party-reaction-kinds";
import { triggerWatchPartyReactionsUpdated } from "@/lib/pusher/server";

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

async function requirePartyReactionRead(roomId: string, userId: string) {
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
    return { ok: false as const, response: NextResponse.json({ error: "Join the party to view reactions" }, { status: 403 }) };
  }
  if (room.status === "OPEN" && row.leftAt != null) {
    return { ok: false as const, response: NextResponse.json({ error: "Rejoin the party to view reactions" }, { status: 403 }) };
  }
  return { ok: true as const };
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
    return { ok: false as const, response: NextResponse.json({ error: "Join the party to react" }, { status: 403 }) };
  }
  return { ok: true as const };
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

  const gate = await requirePartyReactionRead(roomId, authResult.user.id);
  if (!gate.ok) return gate.response;

  const rows = await db.watchPartyReaction.findMany({
    where: { roomId },
    select: { userId: true, kind: true },
  });

  const counts: Record<WatchPartyReactionKind, number> = {
    heart: 0,
    fire: 0,
    clap: 0,
  };
  const mine = new Set<WatchPartyReactionKind>();
  for (const row of rows) {
    if (!isWatchPartyReactionKind(row.kind)) continue;
    counts[row.kind] += 1;
    if (row.userId === authResult.user.id) mine.add(row.kind);
  }

  return NextResponse.json({
    counts,
    mine: [...mine],
  });
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

  let body: { kind?: string };
  try {
    body = (await request.json()) as { kind?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const kind = body.kind?.trim();
  if (!kind || !isWatchPartyReactionKind(kind)) {
    return NextResponse.json(
      { error: `kind must be one of: ${WATCH_PARTY_REACTION_KINDS.join(", ")}` },
      { status: 400 }
    );
  }

  const existing = await db.watchPartyReaction.findUnique({
    where: {
      roomId_userId_kind: {
        roomId,
        userId: authResult.user.id,
        kind,
      },
    },
    select: { id: true },
  });

  if (existing) {
    await db.watchPartyReaction.delete({ where: { id: existing.id } });
  } else {
    await db.watchPartyReaction.create({
      data: { roomId, userId: authResult.user.id, kind },
    });
  }

  await triggerWatchPartyReactionsUpdated(roomId, { action: existing ? "removed" : "added", kind });

  const rows = await db.watchPartyReaction.findMany({
    where: { roomId },
    select: { userId: true, kind: true },
  });

  const counts: Record<WatchPartyReactionKind, number> = { heart: 0, fire: 0, clap: 0 };
  const mine = new Set<WatchPartyReactionKind>();
  for (const row of rows) {
    if (!isWatchPartyReactionKind(row.kind)) continue;
    counts[row.kind] += 1;
    if (row.userId === authResult.user.id) mine.add(row.kind);
  }

  return NextResponse.json({ counts, mine: [...mine] });
}
