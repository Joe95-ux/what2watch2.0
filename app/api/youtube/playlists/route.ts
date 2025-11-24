import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET() {
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

    const playlists = await db.playlist.findMany({
      where: {
        userId: user.id,
        youtubeItems: {
          some: {},
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      select: {
        id: true,
        name: true,
        description: true,
        coverImage: true,
        updatedAt: true,
        _count: {
          select: {
            youtubeItems: true,
          },
        },
        youtubeItems: {
          orderBy: { order: "asc" },
          take: 4,
          select: {
            id: true,
            videoId: true,
            title: true,
            thumbnail: true,
            channelId: true,
            channelTitle: true,
            duration: true,
          },
        },
      },
    });

    return NextResponse.json({ playlists });
  } catch (error) {
    console.error("Error fetching YouTube playlists:", error);
    return NextResponse.json({ error: "Failed to fetch playlists" }, { status: 500 });
  }
}


