import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET - Fetch public watchlist by userId
export async function GET(request: NextRequest): Promise<NextResponse<{ watchlist: unknown[]; user: unknown; currentUserId?: string | null } | { error: string }>> {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    // Get current user if authenticated (for owner check)
    const { userId: clerkUserId } = await auth();
    let currentUserId: string | null = null;

    if (clerkUserId) {
      const currentUser = await db.user.findUnique({
        where: { clerkId: clerkUserId },
        select: { id: true },
      });
      currentUserId = currentUser?.id || null;
    }

    // Get user and check if watchlist is public
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        watchlistIsPublic: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Allow owners to see their watchlist even if private
    if (!user.watchlistIsPublic && currentUserId !== user.id) {
      return NextResponse.json(
        { error: "Watchlist is private" },
        { status: 403 }
      );
    }

    // Fetch watchlist items
    const watchlist = await db.watchlistItem.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      watchlist,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
      },
      currentUserId,
    });
  } catch (error) {
    console.error("Get public watchlist API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch watchlist";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

