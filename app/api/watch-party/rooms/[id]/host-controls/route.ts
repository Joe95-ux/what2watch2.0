import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  clampElapsedMinutes,
  clampProgressPercent,
  hostControlsFromRoom,
} from "@/lib/watch-party/host-controls";
import { isValidWatchPartyRoomId } from "@/lib/watch-party/room-summary-server";
import { triggerWatchPartyHostControlsUpdated } from "@/lib/pusher/server";

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

type PatchBody = {
  progressPercent?: number;
  elapsedMinutes?: number;
  runtimeMinutes?: number | null;
  paused?: boolean;
};

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authResult = await requireUser();
  if (!authResult.ok) return authResult.response;

  const { id: roomId } = await context.params;
  if (!roomId?.trim() || !isValidWatchPartyRoomId(roomId)) {
    return NextResponse.json({ error: "Invalid party id" }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const hasProgress = typeof body.progressPercent === "number";
  const hasElapsed = typeof body.elapsedMinutes === "number";
  const hasPaused = typeof body.paused === "boolean";
  if (!hasProgress && !hasElapsed && !hasPaused) {
    return NextResponse.json(
      { error: "Provide progressPercent, elapsedMinutes, and/or paused" },
      { status: 400 }
    );
  }

  const room = await db.watchPartyRoom.findFirst({
    where: { id: roomId },
    select: {
      id: true,
      hostUserId: true,
      status: true,
      hostSyncProgressPercent: true,
      hostSyncElapsedMinutes: true,
      hostSyncRuntimeMinutes: true,
      hostSyncPaused: true,
      hostSyncUpdatedAt: true,
    },
  });

  if (!room) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }
  if (room.hostUserId !== authResult.user.id) {
    return NextResponse.json({ error: "Only the host can update playback sync" }, { status: 403 });
  }
  if (room.status !== "OPEN") {
    return NextResponse.json({ error: "This party has ended" }, { status: 409 });
  }

  const progressPercent = hasProgress
    ? clampProgressPercent(body.progressPercent as number)
    : room.hostSyncProgressPercent ?? 0;
  const elapsedMinutes = hasElapsed
    ? clampElapsedMinutes(body.elapsedMinutes as number)
    : room.hostSyncElapsedMinutes ?? 1;
  const runtimeMinutes =
    body.runtimeMinutes === null
      ? null
      : typeof body.runtimeMinutes === "number" && body.runtimeMinutes > 0
        ? Math.round(body.runtimeMinutes)
        : room.hostSyncRuntimeMinutes;
  const paused = hasPaused ? Boolean(body.paused) : room.hostSyncPaused;
  const hostSyncUpdatedAt = new Date();

  const updated = await db.watchPartyRoom.update({
    where: { id: roomId },
    data: {
      hostSyncProgressPercent: progressPercent,
      hostSyncElapsedMinutes: elapsedMinutes,
      hostSyncRuntimeMinutes: runtimeMinutes,
      hostSyncPaused: paused,
      hostSyncUpdatedAt,
    },
    select: {
      hostSyncProgressPercent: true,
      hostSyncElapsedMinutes: true,
      hostSyncRuntimeMinutes: true,
      hostSyncPaused: true,
      hostSyncUpdatedAt: true,
    },
  });

  const hostControls = hostControlsFromRoom(updated);
  await triggerWatchPartyHostControlsUpdated(roomId, hostControls ?? {});

  return NextResponse.json({ hostControls });
}
