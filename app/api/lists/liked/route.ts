import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET - Get user's liked lists
export async function GET(request: NextRequest): Promise<NextResponse<{ lists: unknown[] } | { error: string }>> {
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

    // Get liked lists
    const likedLists = await db.likedList.findMany({
      where: { userId: user.id },
      include: {
        list: {
          include: {
            items: {
              take: 5,
              orderBy: { position: "asc" },
              select: {
                posterPath: true,
              },
            },
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
              },
            },
            _count: {
              select: {
                items: true,
                likedBy: true,
                comments: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const lists = likedLists.map((liked) => liked.list);

    return NextResponse.json({ lists });
  } catch (error) {
    console.error("Get liked lists API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch liked lists";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

