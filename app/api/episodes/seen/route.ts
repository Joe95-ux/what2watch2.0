import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

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
