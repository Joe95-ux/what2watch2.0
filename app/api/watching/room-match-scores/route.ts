import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

type RoomScoreInput = {
  key: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  watchingCount: number;
  thoughtCount: number;
  seasonNumber?: number | null;
  episodeNumber?: number | null;
};

function clampPercent(value: number): number {
  return Math.max(55, Math.min(98, Math.round(value)));
}

function fallbackScore(room: RoomScoreInput, inWatchlist: boolean, watchedBefore: boolean, tvPreference: number): number {
  let score = 62;
  if (inWatchlist) score += 18;
  if (watchedBefore) score += 8;
  score += Math.min(8, room.watchingCount * 2);
  score += Math.min(4, room.thoughtCount);
  if (room.mediaType === "tv") score += Math.round(tvPreference * 6);
  return clampPercent(score);
}

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = (await request.json()) as { rooms?: RoomScoreInput[] };
    const rooms = Array.isArray(body?.rooms) ? body.rooms.slice(0, 30) : [];
    if (!rooms.length) return NextResponse.json({ scores: {} });

    const [favorites, watchedTitles, viewingLogs] = await Promise.all([
      db.favorite.findMany({
        where: { userId: user.id },
        select: { tmdbId: true, mediaType: true },
      }),
      db.watchedTitle.findMany({
        where: { userId: user.id },
        select: { tmdbId: true, mediaType: true },
        take: 1000,
      }),
      db.viewingLog.findMany({
        where: { userId: user.id },
        select: { mediaType: true },
        orderBy: { createdAt: "desc" },
        take: 120,
      }),
    ]);

    const watchlistSet = new Set(favorites.map((item) => `${item.mediaType}:${item.tmdbId}`));
    const watchedSet = new Set(watchedTitles.map((item) => `${item.mediaType}:${item.tmdbId}`));
    const tvLogs = viewingLogs.filter((entry) => entry.mediaType === "tv").length;
    const tvPreference = viewingLogs.length ? tvLogs / viewingLogs.length : 0.5;

    const defaultScores: Record<string, number> = {};
    for (const room of rooms) {
      const key = `${room.mediaType}:${room.tmdbId}`;
      const inWatchlist = watchlistSet.has(key);
      const watchedBefore =
        watchedSet.has(key) ||
        watchedTitles.some((entry) => entry.tmdbId === room.tmdbId && entry.mediaType === room.mediaType);
      defaultScores[room.key] = fallbackScore(room, inWatchlist, watchedBefore, tvPreference);
    }

    if (!openai) {
      return NextResponse.json({ scores: defaultScores, source: "fallback" });
    }

    const prompt = {
      instruction:
        "Score each room 0-100 for likely fit for this specific user. Favor relevance, social buzz, and continuity; avoid extreme values. Return strict JSON object only: {\"scores\":{\"roomKey\":number}}.",
      userProfile: {
        watchlistCount: favorites.length,
        watchedCount: watchedTitles.length,
        tvPreferenceRatio: tvPreference,
      },
      rooms: rooms.map((room) => ({
        key: room.key,
        mediaType: room.mediaType,
        title: room.title,
        watchingCount: room.watchingCount,
        thoughtCount: room.thoughtCount,
        seasonNumber: room.seasonNumber ?? null,
        episodeNumber: room.episodeNumber ?? null,
        baseline: defaultScores[room.key],
      })),
    };

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "You are a ranking model. Output only valid JSON.",
        },
        {
          role: "user",
          content: JSON.stringify(prompt),
        },
      ],
      max_tokens: 350,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    let parsed: { scores?: Record<string, number> } | null = null;
    try {
      parsed = JSON.parse(raw) as { scores?: Record<string, number> };
    } catch {
      parsed = null;
    }

    const merged = { ...defaultScores };
    for (const room of rooms) {
      const candidate = parsed?.scores?.[room.key];
      if (typeof candidate === "number" && Number.isFinite(candidate)) {
        merged[room.key] = clampPercent(candidate);
      }
    }

    return NextResponse.json({ scores: merged, source: "model" });
  } catch (error) {
    console.error("room-match-scores error:", error);
    return NextResponse.json({ error: "Failed to calculate room match scores" }, { status: 500 });
  }
}
