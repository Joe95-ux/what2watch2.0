import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * Get user's favorite YouTube channels
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get current user
    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get favorite channels (only those marked as favorite)
    const favorites = await db.favoriteChannel.findMany({
      where: {
        userId: user.id,
        isFavorite: true, // Only return channels marked as favorites
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      favorites,
    });
  } catch (error) {
    console.error("Error fetching favorite channels:", error);
    return NextResponse.json(
      { error: "Failed to fetch favorite channels" },
      { status: 500 }
    );
  }
}

