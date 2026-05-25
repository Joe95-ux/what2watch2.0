import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { mapWatchPartyMarker } from "@/lib/watch-party/map-marker";
import { triggerWatchPartyMarkersUpdated } from "@/lib/pusher/server";

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

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; markerId: string }> }
): Promise<NextResponse> {
  const authResult = await requireUser();
  if (!authResult.ok) return authResult.response;

  const { id: roomId, markerId } = await context.params;
  if (!roomId?.trim() || !markerId?.trim()) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const room = await db.watchPartyRoom.findFirst({
    where: { id: roomId },
    select: { hostUserId: true, status: true },
  });
  if (!room) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }
  if (room.hostUserId !== authResult.user.id) {
    return NextResponse.json({ error: "Only the host can remove markers" }, { status: 403 });
  }

  const existing = await db.watchPartyMarker.findFirst({
    where: { id: markerId, roomId },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Marker not found" }, { status: 404 });
  }

  await db.watchPartyMarker.delete({ where: { id: markerId } });
  await triggerWatchPartyMarkersUpdated(roomId, { action: "unpinned", markerId });

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
