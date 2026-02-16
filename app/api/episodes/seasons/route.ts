import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getTVSeasonDetails, getTVDetails } from "@/lib/tmdb";

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

    // Also create/update a ViewingLog entry for the TV show so it appears in watched tab and diary
    try {
      // Fetch TV show details to get poster, backdrop, and first air date
      const tvShowDetails = await getTVDetails(tvShowTmdbId);
      
      // Check if a ViewingLog already exists for this TV show
      const existingLog = await db.viewingLog.findFirst({
        where: {
          userId: user.id,
          tmdbId: tvShowTmdbId,
          mediaType: "tv",
        },
        orderBy: {
          watchedAt: "desc",
        },
      });

      if (existingLog) {
        // Update the existing log's watchedAt to the current date
        await db.viewingLog.update({
          where: {
            id: existingLog.id,
          },
          data: {
            watchedAt,
            updatedAt: new Date(),
          },
        });
      } else {
        // Create a new ViewingLog entry
        await db.viewingLog.create({
          data: {
            userId: user.id,
            tmdbId: tvShowTmdbId,
            mediaType: "tv",
            title: tvShowTitle || tvShowDetails.name || `TV Show ${tvShowTmdbId}`,
            posterPath: tvShowDetails.poster_path || null,
            backdropPath: tvShowDetails.backdrop_path || null,
            releaseDate: null,
            firstAirDate: tvShowDetails.first_air_date || null,
            watchedAt,
            notes: null,
            rating: null,
            tags: [],
          },
        });

        // Create LOGGED_FILM activity
        try {
          await db.activity.create({
            data: {
              userId: user.id,
              type: "LOGGED_FILM",
              tmdbId: tvShowTmdbId,
              mediaType: "tv",
              title: tvShowTitle || tvShowDetails.name || `TV Show ${tvShowTmdbId}`,
              posterPath: tvShowDetails.poster_path || null,
              rating: null,
            },
          });
        } catch (error) {
          // Silently fail - activity creation is not critical
          console.error("Failed to create activity for viewing log:", error);
        }
      }
    } catch (error) {
      // Log error but don't fail the request - episode tracking is more important
      console.error("Failed to create/update ViewingLog for TV show:", error);
    }

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
