import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getTVSeasonDetails } from "@/lib/tmdb";

// GET - Check which seasons have all episodes seen
export async function GET(request: NextRequest): Promise<NextResponse<{ seenSeasons: number[] } | { error: string }>> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const tvShowTmdbId = searchParams.get("tvShowTmdbId");

    if (!tvShowTmdbId) {
      return NextResponse.json(
        { error: "tvShowTmdbId is required" },
        { status: 400 }
      );
    }

    // Get all seen episodes for this TV show, grouped by season
    const seenEpisodes = await db.episodeViewingLog.findMany({
      where: {
        userId: user.id,
        tvShowTmdbId: parseInt(tvShowTmdbId, 10),
      },
      select: {
        episodeId: true,
        seasonNumber: true,
      },
    });

    // Group episodes by season
    const seasonEpisodesMap = new Map<number, Set<number>>();
    
    for (const log of seenEpisodes) {
      if (!seasonEpisodesMap.has(log.seasonNumber)) {
        seasonEpisodesMap.set(log.seasonNumber, new Set());
      }
      seasonEpisodesMap.get(log.seasonNumber)!.add(log.episodeId);
    }

    // Check each season to see if all episodes are seen
    // Only check seasons that have at least some episodes seen
    const seenSeasons: number[] = [];
    const checkPromises = Array.from(seasonEpisodesMap.entries()).map(async ([seasonNumber, episodeIds]) => {
      try {
        const seasonDetails = await getTVSeasonDetails(parseInt(tvShowTmdbId, 10), seasonNumber);
        if (seasonDetails.episodes && seasonDetails.episodes.length > 0) {
          const allEpisodesSeen = seasonDetails.episodes.every(ep => episodeIds.has(ep.id));
          if (allEpisodesSeen) {
            return seasonNumber;
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch season ${seasonNumber} details:`, error);
      }
      return null;
    });

    const results = await Promise.all(checkPromises);
    const validSeasons = results.filter((s): s is number => s !== null);
    seenSeasons.push(...validSeasons);

    return NextResponse.json({ seenSeasons });
  } catch (error) {
    console.error("Check seasons seen API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to check seasons seen";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
