import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

type RepliesToYouItem = {
  id: string;
  thoughtId: string;
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  seasonNumber: number | null;
  episodeNumber: number | null;
  userName: string;
  userAvatar: string | null;
  text: string;
  createdAt: string;
};

export async function GET(
  request: NextRequest
): Promise<NextResponse<{ replies: RepliesToYouItem[]; total: number } | { error: string }>> {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const pageRaw = Number.parseInt(request.nextUrl.searchParams.get("page") ?? "1", 10);
    const limitRaw = Number.parseInt(request.nextUrl.searchParams.get("limit") ?? "10", 10);
    const page = Number.isInteger(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const limit = Number.isInteger(limitRaw) && limitRaw > 0 ? Math.min(50, limitRaw) : 10;
    const skip = (page - 1) * limit;

    const where = {
      thought: { userId: user.id },
      userId: { not: user.id },
    } as const;

    const [rows, total] = await Promise.all([
      db.watchingThoughtReply.findMany({
        where,
        include: {
          user: {
            select: {
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          thought: {
            select: {
              id: true,
              session: {
                select: {
                  tmdbId: true,
                  mediaType: true,
                  title: true,
                  seasonNumber: true,
                  episodeNumber: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      db.watchingThoughtReply.count({ where }),
    ]);

    const replies: RepliesToYouItem[] = rows.map((row) => ({
      id: row.id,
      thoughtId: row.thought.id,
      tmdbId: row.thought.session.tmdbId,
      mediaType: row.thought.session.mediaType as "movie" | "tv",
      title: row.thought.session.title,
      seasonNumber: row.thought.session.seasonNumber ?? null,
      episodeNumber: row.thought.session.episodeNumber ?? null,
      userName: row.user.displayName || row.user.username || "Someone",
      userAvatar: row.user.avatarUrl ?? null,
      text: row.content,
      createdAt: row.createdAt.toISOString(),
    }));

    return NextResponse.json({ replies, total });
  } catch (error) {
    console.error("watching replies-to-you GET error:", error);
    return NextResponse.json({ error: "Failed to fetch replies to you" }, { status: 500 });
  }
}

