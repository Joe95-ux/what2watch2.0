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

    // Also create a new ViewingLog entry for the TV show (like movies, each viewing session is tracked separately)
    // This ensures proper activity logging and diary tracking
    try {
      // Fetch TV show details to get poster, backdrop, and first air date
      const tvShowDetails = await getTVDetails(tvShowTmdbId);
      
      // Format title with season info
      const baseTitle = tvShowTitle || tvShowDetails.name || `TV Show ${tvShowTmdbId}`;
      const sortedSeasons = [...seasonNumbers].sort((a, b) => a - b);
      let formattedTitle: string;
      
      if (sortedSeasons.length === 1) {
        // Single season: "Foundation S1"
        formattedTitle = `${baseTitle} S${sortedSeasons[0]}`;
      } else {
        // Multiple seasons: "Foundation S1, S2, S3"
        const seasonList = sortedSeasons.map(s => `S${s}`).join(", ");
        formattedTitle = `${baseTitle} ${seasonList}`;
      }
      
      // Create a new ViewingLog entry (allows multiple viewings, like movies)
      const viewingLog = await db.viewingLog.create({
        data: {
          userId: user.id,
          tmdbId: tvShowTmdbId,
          mediaType: "tv",
          title: formattedTitle,
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

      // Create LOGGED_FILM activity (always create, like movies)
      try {
        await db.activity.create({
          data: {
            userId: user.id,
            type: "LOGGED_FILM",
            tmdbId: tvShowTmdbId,
            mediaType: "tv",
            title: formattedTitle,
            posterPath: tvShowDetails.poster_path || null,
            rating: null,
          },
        });
      } catch (error) {
        // Silently fail - activity creation is not critical
        console.error("Failed to create activity for viewing log:", error);
      }
    } catch (error) {
      // Log error but don't fail the request - episode tracking is more important
      console.error("Failed to create ViewingLog for TV show:", error);
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

// DELETE - Unmark seasons as seen (remove all episodes in those seasons)
export async function DELETE(request: NextRequest): Promise<NextResponse<{ success: boolean } | { error: string }>> {
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
    const seasonNumbersParam = searchParams.get("seasonNumbers");

    if (!tvShowTmdbId || !seasonNumbersParam) {
      return NextResponse.json(
        { error: "tvShowTmdbId and seasonNumbers are required" },
        { status: 400 }
      );
    }

    const seasonNumbers = seasonNumbersParam.split(",").map(s => parseInt(s.trim(), 10)).filter(s => !isNaN(s));

    if (seasonNumbers.length === 0) {
      return NextResponse.json(
        { error: "Invalid seasonNumbers" },
        { status: 400 }
      );
    }

    // Fetch episodes for each season from TMDB to get episode IDs
    const allEpisodeIds: number[] = [];
    
    for (const seasonNumber of seasonNumbers) {
      try {
        const seasonDetails = await getTVSeasonDetails(parseInt(tvShowTmdbId, 10), seasonNumber);
        if (seasonDetails.episodes) {
          for (const episode of seasonDetails.episodes) {
            allEpisodeIds.push(episode.id);
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch season ${seasonNumber} details:`, error);
        // Continue with other seasons
      }
    }

    if (allEpisodeIds.length > 0) {
      // Delete all episode viewing logs for these episodes
      await db.episodeViewingLog.deleteMany({
        where: {
          userId: user.id,
          tvShowTmdbId: parseInt(tvShowTmdbId, 10),
          episodeId: {
            in: allEpisodeIds,
          },
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Unmark seasons as seen API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to unmark seasons as seen";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
