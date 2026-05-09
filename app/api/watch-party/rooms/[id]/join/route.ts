import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
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
  if (!roomId?.trim()) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const room = await db.watchPartyRoom.findFirst({
    where: { id: roomId },
    select: { id: true, status: true, hostUserId: true },
  });

  if (!room) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }
  if (room.status !== "OPEN") {
    return NextResponse.json({ error: "Party has ended" }, { status: 410 });
  }

  const existing = await db.watchPartyParticipant.findUnique({
    where: {
      roomId_userId: { roomId, userId: authResult.user.id },
    },
  });

  if (existing) {
    if (existing.leftAt != null) {
      await db.watchPartyParticipant.update({
        where: { id: existing.id },
        data: { leftAt: null, joinedAt: new Date() },
      });
    }
  } else {
    await db.watchPartyParticipant.create({
      data: {
        roomId,
        userId: authResult.user.id,
        role: authResult.user.id === room.hostUserId ? "HOST" : "GUEST",
      },
    });
  }

  await Promise.all([
    triggerWatchPartyParticipantsUpdated(roomId, { action: "joined", userId: authResult.user.id }),
    triggerWatchingDashboardUpdated({ action: "watch_party_join", userId: authResult.user.id }),
  ]);

  return NextResponse.json({ success: true });
}
