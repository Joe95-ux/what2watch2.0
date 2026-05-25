import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  aggregateReactionCounts,
  mapReactionPulseRow,
  type WatchPartyReactionPulseDto,
} from "@/lib/watch-party/reaction-pulses";
import { resolveWatchPartyTimelineTimestampSec } from "@/lib/watch-party/resolve-timeline-timestamp";
import {
  isWatchPartyReactionKind,
  WATCH_PARTY_REACTION_KINDS,
  type WatchPartyReactionKind,
} from "@/lib/watch-party-reaction-kinds";
import { triggerWatchPartyReactionsUpdated } from "@/lib/pusher/server";
import { findActiveWatchPartyParticipant } from "@/lib/watch-party/room-summary-server";
import { isActiveWatchPartyParticipant } from "@/lib/watch-party/participant-active";

const RECENT_PULSE_LIMIT = 80;

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
  if (room.status === "OPEN" && !isActiveWatchPartyParticipant(row.leftAt)) {
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
  const member = await findActiveWatchPartyParticipant(roomId, userId);
  if (!member) {
    return { ok: false as const, response: NextResponse.json({ error: "Join the party to react" }, { status: 403 }) };
  }
  return { ok: true as const };
}

async function loadRecentPulses(roomId: string): Promise<WatchPartyReactionPulseDto[]> {
  const rows = await db.watchPartyReaction.findMany({
    where: { roomId },
    orderBy: { createdAt: "desc" },
    take: RECENT_PULSE_LIMIT,
    include: {
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });
  return [...rows]
    .reverse()
    .map((row) => mapReactionPulseRow(row))
    .filter((p): p is WatchPartyReactionPulseDto => p != null);
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

  const recentPulses = await loadRecentPulses(roomId);
  return NextResponse.json({
    counts: aggregateReactionCounts(recentPulses),
    recentPulses,
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

  let body: { kind?: string; timestampSec?: number | null };
  try {
    body = (await request.json()) as { kind?: string; timestampSec?: number | null };
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

  const clientTimestampSec =
    typeof body.timestampSec === "number" && Number.isFinite(body.timestampSec)
      ? body.timestampSec
      : null;
  const timestampSec = await resolveWatchPartyTimelineTimestampSec(
    roomId,
    authResult.user.id,
    clientTimestampSec
  );

  const created = await db.watchPartyReaction.create({
    data: {
      roomId,
      userId: authResult.user.id,
      kind: kind as WatchPartyReactionKind,
      timestampSec: timestampSec ?? undefined,
    },
    include: {
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  const pulse = mapReactionPulseRow(created);
  if (!pulse) {
    return NextResponse.json({ error: "Invalid reaction kind" }, { status: 500 });
  }

  await triggerWatchPartyReactionsUpdated(roomId, {
    action: "pulse",
    kind,
    pulseId: created.id,
    timestampSec: created.timestampSec,
  });

  const recentPulses = await loadRecentPulses(roomId);
  return NextResponse.json({
    counts: aggregateReactionCounts(recentPulses),
    recentPulses,
    pulse,
  });
}
