import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { triggerWatchPartyRoomUpdated, triggerWatchingDashboardUpdated } from "@/lib/pusher/server";

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
  if (room.hostUserId !== authResult.user.id) {
    return NextResponse.json({ error: "Only the host can end the party" }, { status: 403 });
  }
  if (room.status !== "OPEN") {
    return NextResponse.json({ success: true });
  }

  const endedAt = new Date();
  await db.watchPartyRoom.update({
    where: { id: roomId },
    data: { status: "ENDED", endedAt },
  });

  await Promise.all([
    triggerWatchPartyRoomUpdated(roomId, { action: "ended", hostUserId: authResult.user.id }),
    triggerWatchingDashboardUpdated({ action: "watch_party_ended", userId: authResult.user.id }),
  ]);

  return NextResponse.json({ success: true });
}
