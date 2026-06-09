import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import {
  buildPickForTonightResult,
  getCachedDefaultPicks,
  getPickForTonightBucket,
  type RerankMode,
} from "@/lib/pick-for-tonight";

export type { PickForTonightApiResult } from "@/lib/pick-for-tonight/build";

export async function POST(request: NextRequest) {
  try {
    let onlyUnseen = false;
    let trendingToday = false;
    let rerankMode: RerankMode | null = null;
    let avoidTmdbId: number | null = null;
    let avoidLeadGenre: string | null = null;
    let forceRefresh = false;

    try {
      const body = (await request.json()) as {
        onlyUnseen?: unknown;
        trendingToday?: unknown;
        rerankMode?: unknown;
        avoidTmdbId?: unknown;
        avoidLeadGenre?: unknown;
        forceRefresh?: unknown;
      } | null;
      if (body?.onlyUnseen === true) onlyUnseen = true;
      if (body?.trendingToday === true) trendingToday = true;
      if (body?.forceRefresh === true) forceRefresh = true;
      if (
        body &&
        typeof body.rerankMode === "string" &&
        (body.rerankMode === "lighter" ||
          body.rerankMode === "shorter" ||
          body.rerankMode === "intense" ||
          body.rerankMode === "different" ||
          body.rerankMode === "thoughtful")
      ) {
        rerankMode = body.rerankMode;
      }
      if (body && typeof body.avoidTmdbId === "number" && Number.isFinite(body.avoidTmdbId)) {
        avoidTmdbId = body.avoidTmdbId;
      }
      if (body && typeof body.avoidLeadGenre === "string" && body.avoidLeadGenre.trim()) {
        avoidLeadGenre = body.avoidLeadGenre.trim();
      }
    } catch {
      // empty or invalid body — default picks
    }

    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const bucket = getPickForTonightBucket();
    const useServerCache = !forceRefresh && !rerankMode && avoidTmdbId == null;

    const result = useServerCache
      ? await getCachedDefaultPicks(user.id, bucket, onlyUnseen, trendingToday)
      : await buildPickForTonightResult(user.id, {
          onlyUnseen,
          trendingToday,
          rerankMode,
          avoidTmdbId,
          avoidLeadGenre,
          writeCooldownLog: true,
        });

    return NextResponse.json(result);
  } catch (error) {
    console.error("pick-for-tonight/cards error:", error);
    return NextResponse.json({ error: "Failed to generate picks" }, { status: 500 });
  }
}
