import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { calculateGenrePreferences, calculatePreferredTypes, getContentGenres } from "@/lib/preferences-calculator";

/**
 * Recalculate user preferences based on all their behavior
 * This can be called periodically or when significant actions occur
 */
export async function POST(request: NextRequest): Promise<NextResponse<{ success: boolean; preferences?: unknown } | { error: string }>> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { clerkId: userId },
      include: {
        favorites: true,
        recentlyViewed: true,
        reviews: true,
        playlists: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Fetch genre IDs for all content items
    // Note: In a production system, you might want to cache genre IDs or store them in the database
    const enrichWithGenres = async (items: Array<{ tmdbId: number; mediaType: string; createdAt?: Date; viewedAt?: Date; rating?: number }>) => {
      return Promise.all(
        items.map(async (item) => {
          // Try to get genre IDs from TMDB API
          // For server-side, we need to use the internal API route
          let genreIds: number[] = [];
          try {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL 
              ? `https://${process.env.VERCEL_URL}` 
              : "http://localhost:3000";
            const response = await fetch(
              `${baseUrl}/api/${item.mediaType === "movie" ? "movies" : "tv"}/${item.tmdbId}`,
              { next: { revalidate: 3600 } } // Cache for 1 hour
            );
            if (response.ok) {
              const data = await response.json();
              genreIds = data.genre_ids || data.genres?.map((g: { id: number }) => g.id) || [];
            }
          } catch (error) {
            console.error(`Error fetching genres for ${item.mediaType} ${item.tmdbId}:`, error);
          }
          
          return {
            ...item,
            genreIds,
            createdAt: item.createdAt || item.viewedAt || new Date(),
            rating: item.rating,
          };
        })
      );
    };

    // Enrich all data with genre IDs
    const [favoritesWithGenres, reviewsWithGenres, playlistItemsWithGenres, recentlyViewedWithGenres] = await Promise.all([
      enrichWithGenres(user.favorites.map(f => ({ tmdbId: f.tmdbId, mediaType: f.mediaType, createdAt: f.createdAt }))),
      enrichWithGenres(user.reviews.map(r => ({ tmdbId: r.tmdbId, mediaType: r.mediaType, createdAt: r.createdAt, rating: r.rating }))),
      enrichWithGenres(user.playlists.flatMap((p) => p.items).map(pi => ({ tmdbId: pi.tmdbId, mediaType: pi.mediaType, createdAt: pi.createdAt }))),
      enrichWithGenres(user.recentlyViewed.map(rv => ({ tmdbId: rv.tmdbId, mediaType: rv.mediaType, viewedAt: rv.viewedAt }))),
    ]);

    // Calculate new preferences
    const behaviorData = {
      favorites: favoritesWithGenres.map((f) => ({
        tmdbId: f.tmdbId,
        mediaType: f.mediaType as "movie" | "tv",
        genreIds: f.genreIds,
        createdAt: f.createdAt,
      })),
      reviews: reviewsWithGenres.map((r) => ({
        tmdbId: r.tmdbId,
        mediaType: r.mediaType as "movie" | "tv",
        genreIds: r.genreIds,
        rating: "rating" in r && typeof r.rating === "number" ? r.rating : undefined,
        createdAt: r.createdAt,
      })),
      playlistItems: playlistItemsWithGenres.map((p) => ({
        tmdbId: p.tmdbId,
        mediaType: p.mediaType as "movie" | "tv",
        genreIds: p.genreIds,
        createdAt: p.createdAt,
      })),
      recentlyViewed: recentlyViewedWithGenres.map((rv) => ({
        tmdbId: rv.tmdbId,
        mediaType: rv.mediaType as "movie" | "tv",
        genreIds: rv.genreIds,
        createdAt: rv.createdAt,
      })),
    };

    const favoriteGenres = calculateGenrePreferences(behaviorData);
    const preferredTypes = calculatePreferredTypes(behaviorData);

    // Update preferences
    const preferences = await db.userPreferences.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        favoriteGenres,
        preferredTypes,
        onboardingCompleted: true,
      },
      update: {
        favoriteGenres,
        preferredTypes,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, preferences });
  } catch (error) {
    console.error("Recalculate preferences API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to recalculate preferences";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

