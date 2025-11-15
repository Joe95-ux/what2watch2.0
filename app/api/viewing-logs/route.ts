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
    const { tmdbId, mediaType, title, posterPath, backdropPath, releaseDate, firstAirDate, watchedAt, notes, rating } = body;

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
      },
    });

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

