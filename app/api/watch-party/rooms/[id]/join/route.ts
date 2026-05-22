import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  getWatchPartyRoomSummaryForUser,
  isValidWatchPartyRoomId,
  normalizeWatchPartyStatus,
  upsertWatchPartyParticipant,
} from "@/lib/watch-party/room-summary-server";
import { triggerWatchPartyParticipantsUpdated, triggerWatchingDashboardUpdated } from "@/lib/pusher/server";

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

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authResult = await requireUser();
  if (!authResult.ok) return authResult.response;

  const { id: roomId } = await context.params;
  if (!roomId?.trim() || !isValidWatchPartyRoomId(roomId)) {
    return NextResponse.json({ error: "Invalid party id" }, { status: 400 });
  }

  const room = await db.watchPartyRoom.findFirst({
    where: { id: roomId },
    select: { id: true, status: true, hostUserId: true },
  });

  if (!room) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }

  const status = normalizeWatchPartyStatus(room.status);
  if (status !== "OPEN") {
    const endedSummary = await getWatchPartyRoomSummaryForUser(room.id, authResult.user.id);
    return NextResponse.json(
      {
        error: "This watch party has ended. Ask the host for a new invite link.",
        status,
        summary: endedSummary,
      },
      { status: 410 }
    );
  }

  await upsertWatchPartyParticipant(room.id, authResult.user.id, room.hostUserId);

  const summary = await getWatchPartyRoomSummaryForUser(room.id, authResult.user.id);
  if (!summary) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }

  await Promise.all([
    triggerWatchPartyParticipantsUpdated(roomId, { action: "joined", userId: authResult.user.id }),
    triggerWatchingDashboardUpdated({ action: "watch_party_join", userId: authResult.user.id }),
  ]);

  return NextResponse.json({ success: true, summary });
}
