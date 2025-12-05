import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// DELETE - Remove a viewing log entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
): Promise<NextResponse<{ success: boolean } | { error: string }>> {
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

    const { logId } = await params;

    // Verify the log belongs to the user
    const log = await db.viewingLog.findUnique({
      where: { id: logId },
      select: { userId: true },
    });

    if (!log) {
      return NextResponse.json({ error: "Viewing log not found" }, { status: 404 });
    }

    if (log.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.viewingLog.delete({
      where: { id: logId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete viewing log API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to delete viewing log";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// PATCH - Update a viewing log entry (e.g., update notes or watched date)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
): Promise<NextResponse<{ success: boolean; log?: unknown } | { error: string }>> {
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

    const { logId } = await params;
    const body = await request.json();

    // Verify the log belongs to the user
    const existingLog = await db.viewingLog.findUnique({
      where: { id: logId },
      select: { userId: true },
    });

    if (!existingLog) {
      return NextResponse.json({ error: "Viewing log not found" }, { status: 404 });
    }

    if (existingLog.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prepare update data
    const updateData: {
      watchedAt?: Date;
      notes?: string | null;
      rating?: number | null;
      tags?: string[];
    } = {};

    if (body.watchedAt) {
      updateData.watchedAt = new Date(body.watchedAt);
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes || null;
    }

    if (body.rating !== undefined) {
      if (body.rating === null) {
        updateData.rating = null;
      } else if (Number.isInteger(body.rating) && body.rating >= 1 && body.rating <= 5) {
        updateData.rating = body.rating;
      } else {
        return NextResponse.json(
          { error: "Rating must be between 1 and 5" },
          { status: 400 }
        );
      }
    }

    if (body.tags !== undefined) {
      // Parse tags from comma-separated string or array
      let tagsArray: string[] = [];
      if (body.tags) {
        if (typeof body.tags === "string") {
          tagsArray = body.tags.split(",").map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);
        } else if (Array.isArray(body.tags)) {
          tagsArray = body.tags.filter((tag: unknown): tag is string => typeof tag === "string" && tag.trim().length > 0);
        }
      }
      updateData.tags = tagsArray;
    }

    // Get the full log to access tmdbId and mediaType for review update
    const fullLog = await db.viewingLog.findUnique({
      where: { id: logId },
      select: {
        tmdbId: true,
        mediaType: true,
        userId: true,
      },
    });

    if (!fullLog) {
      return NextResponse.json({ error: "Viewing log not found" }, { status: 404 });
    }

    const log = await db.viewingLog.update({
      where: { id: logId },
      data: updateData,
    });

    // Create or update review if notes are provided
    if (updateData.notes !== undefined && updateData.notes && updateData.notes.trim().length > 0) {
      try {
        // Convert 1-5 rating to 1-10 rating (multiply by 2)
        const reviewRating = updateData.rating ? updateData.rating * 2 : (log.rating ? log.rating * 2 : 5);

        // Check if review already exists
        const existingReview = await db.review.findUnique({
          where: {
            userId_tmdbId_mediaType: {
              userId: fullLog.userId,
              tmdbId: fullLog.tmdbId,
              mediaType: fullLog.mediaType,
            },
          },
        });

        if (existingReview) {
          // Update existing review
          await db.review.update({
            where: { id: existingReview.id },
            data: {
              rating: reviewRating,
              content: updateData.notes.trim(),
              containsSpoilers: false,
            },
          });
        } else {
          // Create new review
          await db.review.create({
            data: {
              userId: fullLog.userId,
              tmdbId: fullLog.tmdbId,
              mediaType: fullLog.mediaType,
              rating: reviewRating,
              content: updateData.notes.trim(),
              containsSpoilers: false,
            },
          });
        }
      } catch (error) {
        // Silently fail - review creation is not critical
        console.error("Failed to create/update review from viewing log update:", error);
      }
    }

    return NextResponse.json({ success: true, log });
  } catch (error) {
    console.error("Update viewing log API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update viewing log";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

