import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { watchPartyFeedRoomKey } from "@/lib/watch-party-feed-key";
import {
  getWatchPartyRoomSummaryForUser,
  upsertWatchPartyParticipant,
} from "@/lib/watch-party/room-summary-server";
import { notifyWatchPartyHostLive } from "@/lib/watch-party/notify-host-live";
import {
  triggerWatchPartyParticipantsUpdated,
  triggerWatchPartyRoomUpdated,
  triggerWatchingDashboardUpdated,
} from "@/lib/pusher/server";

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

type EnsureBody = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  posterPath?: string | null;
  backdropPath?: string | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  watchingSessionId?: string | null;
};

function parseWatchingSessionId(value: unknown): string | null {
  if (value == null) return null;
  const id = String(value).trim();
  return /^[a-f\d]{24}$/i.test(id) ? id : null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const authResult = await requireUser();
    if (!authResult.ok) return authResult.response;

    let body: EnsureBody;
    try {
      body = (await request.json()) as EnsureBody;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    if (!body.tmdbId || body.tmdbId <= 0 || (body.mediaType !== "movie" && body.mediaType !== "tv") || !body.title?.trim()) {
      return NextResponse.json({ error: "tmdbId, mediaType, and title are required" }, { status: 400 });
    }

    const seasonNumber = body.mediaType === "tv" ? body.seasonNumber ?? null : null;
    const episodeNumber = body.mediaType === "tv" ? body.episodeNumber ?? null : null;
    const watchingSessionId = parseWatchingSessionId(body.watchingSessionId);

    const existing = await db.watchPartyRoom.findFirst({
      where: {
        hostUserId: authResult.user.id,
        status: "OPEN",
        tmdbId: body.tmdbId,
        mediaType: body.mediaType,
        seasonNumber,
        episodeNumber,
      },
      select: { id: true, hostUserId: true },
    });

    let roomId: string;

    if (existing) {
      roomId = existing.id;
      await upsertWatchPartyParticipant(roomId, authResult.user.id, existing.hostUserId);
      await Promise.all([
        triggerWatchPartyParticipantsUpdated(roomId, { action: "joined", userId: authResult.user.id }),
        triggerWatchingDashboardUpdated({ action: "watch_party_join", userId: authResult.user.id }),
      ]);
    } else {
      const room = await db.watchPartyRoom.create({
        data: {
          hostUserId: authResult.user.id,
          tmdbId: body.tmdbId,
          mediaType: body.mediaType,
          title: body.title.trim(),
          posterPath: body.posterPath ?? null,
          backdropPath: body.backdropPath ?? null,
          seasonNumber,
          episodeNumber,
          watchingSessionId,
        },
        select: { id: true, hostUserId: true },
      });
      roomId = room.id;
      await upsertWatchPartyParticipant(roomId, authResult.user.id, room.hostUserId);

      await Promise.all([
        triggerWatchPartyRoomUpdated(roomId, { action: "created", hostUserId: authResult.user.id }),
        triggerWatchPartyParticipantsUpdated(roomId, { action: "joined", userId: authResult.user.id }),
        triggerWatchingDashboardUpdated({ action: "watch_party_created", userId: authResult.user.id }),
      ]);
    }

    const feedRoomKey = watchPartyFeedRoomKey(body.tmdbId, body.mediaType, seasonNumber, episodeNumber);

    if (!existing) {
      void notifyWatchPartyHostLive({
        hostUserId: authResult.user.id,
        roomId,
        title: body.title.trim(),
        feedRoomKey,
        mediaType: body.mediaType,
        tmdbId: body.tmdbId,
      }).catch((err) => console.error("[watch-party] notify followers failed", err));
    }
    const summary = await getWatchPartyRoomSummaryForUser(roomId, authResult.user.id);

    return NextResponse.json({
      id: roomId,
      feedRoomKey,
      created: !existing,
      summary,
    });
  } catch (error) {
    console.error("[watch-party ensure] error:", error);
    return NextResponse.json({ error: "Failed to create watch party" }, { status: 500 });
  }
}
