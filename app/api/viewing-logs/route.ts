import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET - Fetch user's viewing logs (diary entries)
export async function GET(request: NextRequest): Promise<NextResponse<{ logs: unknown[] } | { error: string }>> {
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
    const limit = searchParams.get("limit");
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    const orderBy = searchParams.get("orderBy") || "watchedAt"; // "watchedAt" or "createdAt"
    const order = searchParams.get("order") || "desc"; // "asc" or "desc"

    const logs = await db.viewingLog.findMany({
      where: { userId: user.id },
      orderBy: {
        [orderBy]: order,
      },
      take: limitNum,
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Get viewing logs API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch viewing logs";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// POST - Log a viewing (add to diary)
export async function POST(request: NextRequest): Promise<NextResponse<{ success: boolean; log?: unknown } | { error: string }>> {
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
    const { tmdbId, mediaType, title, posterPath, backdropPath, releaseDate, firstAirDate, watchedAt, notes, rating, tags } = body;

    if (!tmdbId || !mediaType || !title) {
      return NextResponse.json(
        { error: "Missing required fields: tmdbId, mediaType, title" },
        { status: 400 }
      );
    }

    // watchedAt can be a date string or default to now
    const watchedDate = watchedAt ? new Date(watchedAt) : new Date();

    // Validate rating if provided (1-5)
    if (rating !== undefined && rating !== null) {
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return NextResponse.json(
          { error: "Rating must be between 1 and 5" },
          { status: 400 }
        );
      }
    }

    // Check for existing log with same tmdbId and mediaType (optional: prevent duplicates)
    // Note: We allow multiple logs for the same film (user can watch it multiple times)
    // If you want to prevent duplicates, uncomment the following:
    /*
    const existingLog = await db.viewingLog.findFirst({
      where: {
        userId: user.id,
        tmdbId,
        mediaType,
      },
    });

    if (existingLog) {
      return NextResponse.json(
        { error: "This film has already been logged" },
        { status: 400 }
      );
    }
    */

    // Parse tags from comma-separated string or array
    let tagsArray: string[] = [];
    if (tags) {
      if (typeof tags === "string") {
        tagsArray = tags.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0);
      } else if (Array.isArray(tags)) {
        tagsArray = tags.filter(tag => typeof tag === "string" && tag.trim().length > 0);
      }
    }

    const log = await db.viewingLog.create({
      data: {
        userId: user.id,
        tmdbId,
        mediaType,
        title,
        posterPath: posterPath || null,
        backdropPath: backdropPath || null,
        releaseDate: releaseDate || null,
        firstAirDate: firstAirDate || null,
        watchedAt: watchedDate,
        notes: notes || null,
        rating: rating || null,
        tags: tagsArray,
      },
    });

    // Create or update review if notes are provided
    if (notes && notes.trim().length > 0) {
      try {
        // Convert 1-5 rating to 1-10 rating (multiply by 2)
        const reviewRating = rating ? rating * 2 : 5; // Default to 5/10 if no rating

        // Check if review already exists
        const existingReview = await db.review.findUnique({
          where: {
            userId_tmdbId_mediaType: {
              userId: user.id,
              tmdbId,
              mediaType,
            },
          },
        });

        if (existingReview) {
          // Update existing review
          await db.review.update({
            where: { id: existingReview.id },
            data: {
              rating: reviewRating,
              content: notes.trim(),
              containsSpoilers: false, // Could be enhanced to detect spoilers
            },
          });
        } else {
          // Create new review
          await db.review.create({
            data: {
              userId: user.id,
              tmdbId,
              mediaType,
              rating: reviewRating,
              content: notes.trim(),
              containsSpoilers: false,
            },
          });
        }
      } catch (error) {
        // Silently fail - review creation is not critical
        console.error("Failed to create/update review from viewing log:", error);
      }
    }

    // Create activities for logging, rating, and reviewing
    try {
      const activities: Array<{
        type: "LOGGED_FILM" | "RATED_FILM" | "REVIEWED_FILM";
        tmdbId: number;
        mediaType: string;
        title: string;
        posterPath: string | null;
        rating?: number | null;
      }> = [];

      // Always create LOGGED_FILM activity
      activities.push({
        type: "LOGGED_FILM",
        tmdbId,
        mediaType,
        title,
        posterPath: posterPath || null,
      });

      // Create RATED_FILM activity if rating is provided
      if (rating !== undefined && rating !== null) {
        activities.push({
          type: "RATED_FILM",
          tmdbId,
          mediaType,
          title,
          posterPath: posterPath || null,
          rating,
        });
      }

      // Create REVIEWED_FILM activity if notes are provided
      if (notes && notes.trim().length > 0) {
        activities.push({
          type: "REVIEWED_FILM",
          tmdbId,
          mediaType,
          title,
          posterPath: posterPath || null,
        });
      }

      // Create all activities
      for (const activity of activities) {
        await db.activity.create({
          data: {
            userId: user.id,
            type: activity.type,
            tmdbId: activity.tmdbId,
            mediaType: activity.mediaType,
            title: activity.title,
            posterPath: activity.posterPath,
            rating: activity.rating || null,
          },
        });
      }
    } catch (error) {
      // Silently fail - activity creation is not critical
      console.error("Failed to create activity for viewing log:", error);
    }

    return NextResponse.json({ success: true, log });
  } catch (error) {
    console.error("Create viewing log API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to create viewing log";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

