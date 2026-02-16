import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getTVSeasonDetails } from "@/lib/tmdb";

// POST - Mark seasons as seen (all episodes in those seasons)
export async function POST(request: NextRequest): Promise<NextResponse<{ success: boolean } | { error: string }>> {
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

    const body = await request.json();
    const { tvShowTmdbId, tvShowTitle, seasonNumbers } = body;

    if (!tvShowTmdbId || !seasonNumbers || !Array.isArray(seasonNumbers)) {
      return NextResponse.json(
        { error: "tvShowTmdbId and seasonNumbers array are required" },
        { status: 400 }
      );
    }

    // Fetch episodes for each season from TMDB
    const allEpisodes: Array<{ episodeId: number; seasonNumber: number; episodeNumber: number }> = [];
    
    for (const seasonNumber of seasonNumbers) {
      try {
        const seasonDetails = await getTVSeasonDetails(tvShowTmdbId, seasonNumber);
        if (seasonDetails.episodes) {
          for (const episode of seasonDetails.episodes) {
            allEpisodes.push({
              episodeId: episode.id,
              seasonNumber: episode.season_number,
              episodeNumber: episode.episode_number,
            });
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch season ${seasonNumber} details:`, error);
        // Continue with other seasons
      }
    }

    if (allEpisodes.length === 0) {
      return NextResponse.json(
        { error: "No episodes found for selected seasons" },
        { status: 400 }
      );
    }

    // Create or update episode viewing logs using upsert
    // MongoDB doesn't support skipDuplicates in createMany, so we use upsert instead
    const watchedAt = new Date();
    
    await Promise.all(
      allEpisodes.map((ep) =>
        db.episodeViewingLog.upsert({
          where: {
            userId_tvShowTmdbId_episodeId: {
              userId: user.id,
              tvShowTmdbId,
              episodeId: ep.episodeId,
            },
          },
          create: {
            userId: user.id,
            tvShowTmdbId,
            tvShowTitle: tvShowTitle || `TV Show ${tvShowTmdbId}`,
            episodeId: ep.episodeId,
            seasonNumber: ep.seasonNumber,
            episodeNumber: ep.episodeNumber,
            watchedAt,
          },
          update: {
            watchedAt,
            updatedAt: new Date(),
          },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark seasons as seen API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to mark seasons as seen";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
