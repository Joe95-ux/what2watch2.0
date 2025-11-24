import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

type RouteParams = { videoId: string };

export async function POST(request: NextRequest, { params }: { params: Promise<RouteParams> }) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { videoId } = await params;

    if (!videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const video = body?.video;

    if (!video || !video.id || !video.title || !video.channelId || !video.videoUrl) {
      return NextResponse.json(
        { error: "video payload with id, title, channelId, and videoUrl is required" },
        { status: 400 }
      );
    }

    const favorite = await db.youTubeVideoFavorite.upsert({
      where: {
        userId_videoId: {
          userId: user.id,
          videoId,
        },
      },
      update: {
        title: video.title,
        thumbnail: video.thumbnail ?? null,
        channelId: video.channelId,
        channelTitle: video.channelTitle ?? null,
        duration: video.duration ?? null,
        videoUrl: video.videoUrl,
        description: video.description ?? null,
        publishedAt: video.publishedAt ?? null,
      },
      create: {
        userId: user.id,
        videoId,
        title: video.title,
        thumbnail: video.thumbnail ?? null,
        channelId: video.channelId,
        channelTitle: video.channelTitle ?? null,
        duration: video.duration ?? null,
        videoUrl: video.videoUrl,
        description: video.description ?? null,
        publishedAt: video.publishedAt ?? null,
      },
    });

    return NextResponse.json({ success: true, favorite });
  } catch (error) {
    console.error("Error favoriting YouTube video:", error);
    return NextResponse.json({ error: "Failed to favorite video" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<RouteParams> }) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { videoId } = await params;

    if (!videoId) {
      return NextResponse.json({ error: "videoId is required" }, { status: 400 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await db.youTubeVideoFavorite.deleteMany({
      where: {
        userId: user.id,
        videoId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error removing favorite YouTube video:", error);
    return NextResponse.json({ error: "Failed to remove favorite video" }, { status: 500 });
  }
}


