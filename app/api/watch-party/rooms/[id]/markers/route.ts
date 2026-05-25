import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { moderateContent } from "@/lib/moderation";
import { mapWatchPartyMarker } from "@/lib/watch-party/map-marker";
import { resolveWatchPartyTimelineTimestampSec } from "@/lib/watch-party/resolve-timeline-timestamp";
import { triggerWatchPartyMarkersUpdated } from "@/lib/pusher/server";
import { findActiveWatchPartyParticipant } from "@/lib/watch-party/room-summary-server";
import { isActiveWatchPartyParticipant } from "@/lib/watch-party/participant-active";

const MARKER_LIMIT = 24;

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

async function requirePartyMarkerRead(roomId: string, userId: string) {
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
    return { ok: false as const, response: NextResponse.json({ error: "Join the party to view markers" }, { status: 403 }) };
  }
  if (room.status === "OPEN" && !isActiveWatchPartyParticipant(row.leftAt)) {
    return { ok: false as const, response: NextResponse.json({ error: "Rejoin the party to view markers" }, { status: 403 }) };
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

  const gate = await requirePartyMarkerRead(roomId, authResult.user.id);
  if (!gate.ok) return gate.response;

  const rows = await db.watchPartyMarker.findMany({
    where: { roomId },
    orderBy: { timestampSec: "asc" },
    take: MARKER_LIMIT,
    include: {
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({
    markers: rows.map((row) => mapWatchPartyMarker(row)),
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

  const room = await db.watchPartyRoom.findFirst({
    where: { id: roomId },
    select: { id: true, hostUserId: true, status: true },
  });
  if (!room) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }
  if (room.status !== "OPEN") {
    return NextResponse.json({ error: "Party has ended" }, { status: 410 });
  }
  if (room.hostUserId !== authResult.user.id) {
    return NextResponse.json({ error: "Only the host can pin moments" }, { status: 403 });
  }

  const member = await findActiveWatchPartyParticipant(roomId, authResult.user.id);
  if (!member) {
    return NextResponse.json({ error: "Join the party to pin moments" }, { status: 403 });
  }

  let body: { label?: string | null; timestampSec?: number | null };
  try {
    body = (await request.json()) as { label?: string | null; timestampSec?: number | null };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const labelRaw = typeof body.label === "string" ? body.label.trim() : "";
  const labelModeration = labelRaw
    ? moderateContent(labelRaw, { minLength: 1, maxLength: 80, allowProfanity: false, sanitizeHtml: true })
    : { allowed: true, sanitized: null as string | null };
  if (!labelModeration.allowed) {
    return NextResponse.json({ error: labelModeration.error || "Invalid label" }, { status: 400 });
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
  if (timestampSec == null) {
    return NextResponse.json(
      { error: "Sync playback or start watching to pin a moment on the timeline." },
      { status: 400 }
    );
  }

  const created = await db.watchPartyMarker.create({
    data: {
      roomId,
      userId: authResult.user.id,
      timestampSec,
      label: labelModeration.sanitized ?? undefined,
    },
    include: {
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  const marker = mapWatchPartyMarker(created);
  await triggerWatchPartyMarkersUpdated(roomId, { action: "pinned", markerId: created.id });

  const rows = await db.watchPartyMarker.findMany({
    where: { roomId },
    orderBy: { timestampSec: "asc" },
    take: MARKER_LIMIT,
    include: {
      user: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({
    marker,
    markers: rows.map((row) => mapWatchPartyMarker(row)),
  });
}
