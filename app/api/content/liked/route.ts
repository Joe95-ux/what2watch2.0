import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET - Get current user's liked content
export async function GET(request: NextRequest) {
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

    // Get all liked content reactions
    const likedReactions = await db.contentReaction.findMany({
      where: {
        userId: user.id,
        reactionType: "like",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Format response
    const likedContent = likedReactions.map((reaction) => ({
      tmdbId: reaction.tmdbId,
      mediaType: reaction.mediaType,
      createdAt: reaction.createdAt,
    }));

    return NextResponse.json({ likedContent });
  } catch (error) {
    console.error("Error fetching liked content:", error);
    return NextResponse.json(
      { error: "Failed to fetch liked content" },
      { status: 500 }
    );
  }
}

