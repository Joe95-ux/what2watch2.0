import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { triggerWatchPartyParticipantsUpdated } from "@/lib/pusher/server";
import { findActiveWatchPartyParticipant } from "@/lib/watch-party/room-summary-server";

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
    select: { id: true, hostUserId: true },
  });
  if (!room) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }

  if (room.hostUserId === authResult.user.id) {
    return NextResponse.json({ error: "Host should end the party instead of leaving" }, { status: 400 });
  }

  const member = await findActiveWatchPartyParticipant(roomId, authResult.user.id);
  if (member) {
    await db.watchPartyParticipant.update({
      where: { id: member.id },
      data: { leftAt: new Date() },
    });
  }

  await triggerWatchPartyParticipantsUpdated(roomId, { action: "left", userId: authResult.user.id });

  return NextResponse.json({ success: true });
}
