import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getTVDetails } from "@/lib/tmdb";

// POST - Mark episode as seen
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
    const { tvShowTmdbId, tvShowTitle, episodeId, seasonNumber, episodeNumber } = body;

    if (!tvShowTmdbId || !episodeId || seasonNumber === undefined || episodeNumber === undefined) {
      return NextResponse.json(
        { error: "tvShowTmdbId, episodeId, seasonNumber, and episodeNumber are required" },
        { status: 400 }
      );
    }

    // Upsert episode viewing log
    await db.episodeViewingLog.upsert({
      where: {
        userId_tvShowTmdbId_episodeId: {
          userId: user.id,
          tvShowTmdbId,
          episodeId,
        },
      },
      create: {
        userId: user.id,
        tvShowTmdbId,
        tvShowTitle: tvShowTitle || `TV Show ${tvShowTmdbId}`,
        episodeId,
        seasonNumber,
        episodeNumber,
        watchedAt: new Date(),
      },
      update: {
        watchedAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Also create a new ViewingLog entry for the TV show when marking individual episodes
    // Only create if this is the first episode being marked (to avoid spam)
    try {
      // Check if there are any other episodes already marked for this TV show
      const existingEpisodeLogs = await db.episodeViewingLog.findFirst({
        where: {
          userId: user.id,
          tvShowTmdbId,
          episodeId: {
            not: episodeId, // Exclude the current episode
          },
        },
      });

      // Only create ViewingLog if this is the first episode being marked
      if (!existingEpisodeLogs) {
        // Fetch TV show details to get poster, backdrop, and first air date
        const tvShowDetails = await getTVDetails(tvShowTmdbId);
        
        const watchedAt = new Date();
        
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

        // Create LOGGED_FILM activity (only for first episode to avoid spam)
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
      console.error("Failed to create ViewingLog for TV show:", error);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark episode as seen API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to mark episode as seen";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE - Mark episode as not seen
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
    const episodeId = searchParams.get("episodeId");

    if (!tvShowTmdbId || !episodeId) {
      return NextResponse.json(
        { error: "tvShowTmdbId and episodeId are required" },
        { status: 400 }
      );
    }

    await db.episodeViewingLog.deleteMany({
      where: {
        userId: user.id,
        tvShowTmdbId: parseInt(tvShowTmdbId, 10),
        episodeId: parseInt(episodeId, 10),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark episode as not seen API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to mark episode as not seen";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
