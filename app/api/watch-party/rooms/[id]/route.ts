import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { watchPartyFeedRoomKey } from "@/lib/watch-party-feed-key";

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

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const authResult = await requireUser();
  if (!authResult.ok) return authResult.response;

  const { id } = await context.params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const room = await db.watchPartyRoom.findFirst({
    where: { id },
    select: {
      id: true,
      hostUserId: true,
      status: true,
      tmdbId: true,
      mediaType: true,
      title: true,
      posterPath: true,
      seasonNumber: true,
      episodeNumber: true,
    },
  });

  if (!room) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }

  const activeCount = await db.watchPartyParticipant.count({
    where: { roomId: room.id, leftAt: null },
  });

  const feedRoomKey = watchPartyFeedRoomKey(
    room.tmdbId,
    room.mediaType as "movie" | "tv",
    room.seasonNumber,
    room.episodeNumber
  );

  return NextResponse.json({
    id: room.id,
    title: room.title,
    tmdbId: room.tmdbId,
    mediaType: room.mediaType,
    seasonNumber: room.seasonNumber,
    episodeNumber: room.episodeNumber,
    posterPath: room.posterPath,
    feedRoomKey,
    participantCount: activeCount,
    isHost: room.hostUserId === authResult.user.id,
    status: room.status,
  });
}
