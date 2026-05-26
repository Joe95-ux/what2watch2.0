import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { mapWatchPartySchedule } from "@/lib/watch-party/map-schedule";

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

export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireUser();
  if (!authResult.ok) return authResult.response;

  const { searchParams } = new URL(request.url);
  const hostUserId = searchParams.get("hostUserId")?.trim() || authResult.user.id;
  const tmdbIdRaw = searchParams.get("tmdbId");
  const mediaType = searchParams.get("mediaType");
  const now = new Date();

  const where: {
    hostUserId: string;
    scheduledAt: { gte: Date };
    tmdbId?: number;
    mediaType?: string;
  } = {
    hostUserId,
    scheduledAt: { gte: new Date(now.getTime() - 60 * 60 * 1000) },
  };

  if (tmdbIdRaw) {
    const tmdbId = Number(tmdbIdRaw);
    if (Number.isFinite(tmdbId) && tmdbId > 0) where.tmdbId = tmdbId;
  }
  if (mediaType === "movie" || mediaType === "tv") {
    where.mediaType = mediaType;
  }

  const rows = await db.watchPartySchedule.findMany({
    where,
    orderBy: { scheduledAt: "asc" },
    take: 20,
    include: {
      host: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({
    schedules: rows.map((row) => mapWatchPartySchedule(row)),
  });
}

type CreateBody = {
  tmdbId?: number;
  mediaType?: "movie" | "tv";
  title?: string;
  posterPath?: string | null;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
  scheduledAt?: string;
  recurrence?: "NONE" | "WEEKLY";
  note?: string | null;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const authResult = await requireUser();
  if (!authResult.ok) return authResult.response;

  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.tmdbId || body.tmdbId <= 0 || (body.mediaType !== "movie" && body.mediaType !== "tv") || !body.title?.trim()) {
    return NextResponse.json({ error: "tmdbId, mediaType, and title are required" }, { status: 400 });
  }

  const scheduledAt = body.scheduledAt ? new Date(body.scheduledAt) : null;
  if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
    return NextResponse.json({ error: "scheduledAt must be a valid ISO datetime" }, { status: 400 });
  }
  if (scheduledAt.getTime() < Date.now() - 5 * 60 * 1000) {
    return NextResponse.json({ error: "scheduledAt must be in the future" }, { status: 400 });
  }

  const recurrence = body.recurrence === "WEEKLY" ? "WEEKLY" : "NONE";
  const note = typeof body.note === "string" ? body.note.trim().slice(0, 120) : null;

  const created = await db.watchPartySchedule.create({
    data: {
      hostUserId: authResult.user.id,
      tmdbId: body.tmdbId,
      mediaType: body.mediaType,
      title: body.title.trim(),
      posterPath: body.posterPath ?? null,
      seasonNumber: body.mediaType === "tv" ? body.seasonNumber ?? null : null,
      episodeNumber: body.mediaType === "tv" ? body.episodeNumber ?? null : null,
      scheduledAt,
      recurrence,
      note: note || null,
    },
    include: {
      host: { select: { id: true, username: true, displayName: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({ schedule: mapWatchPartySchedule(created) });
}
