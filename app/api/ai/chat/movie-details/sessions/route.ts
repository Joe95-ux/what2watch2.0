import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET - Fetch all chat sessions for a specific movie/TV show
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

    const { searchParams } = new URL(request.url);
    const tmdbId = searchParams.get("tmdbId");

    if (!tmdbId) {
      return NextResponse.json({ error: "tmdbId is required" }, { status: 400 });
    }

    // Find all sessions for this movie/TV show
    // Session IDs are in format: movie-details-{tmdbId}-{sessionId}
    const sessions = await db.aiChatSession.findMany({
      where: {
        userId: user.id,
        sessionId: {
          startsWith: `movie-details-${tmdbId}-`,
        },
        mode: "movie-details",
      },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        sessionId: true,
        title: true,
        messages: true,
        createdAt: true,
        updatedAt: true,
        metadata: true,
      },
    });

    // Format sessions for response
    const formattedSessions = sessions.map((session) => {
      const messages = Array.isArray(session.messages) ? session.messages : [];
      const metadata = (session.metadata as any) || {};
      
      // Extract session ID (the part after movie-details-{tmdbId}-)
      const sessionIdPart = session.sessionId.replace(`movie-details-${tmdbId}-`, "");
      
      return {
        id: session.id,
        sessionId: sessionIdPart,
        fullSessionId: session.sessionId,
        title: session.title || "Chat Session",
        messageCount: messages.length,
        firstMessage: messages.length > 0 && messages[0] && typeof messages[0] === "object" && "content" in messages[0]
          ? (messages[0].content as string).substring(0, 100)
          : null,
        createdAt: session.createdAt.toISOString(),
        updatedAt: session.updatedAt.toISOString(),
        tmdbId: metadata.tmdbId || parseInt(tmdbId, 10),
        mediaType: metadata.mediaType || "movie",
      };
    });

    return NextResponse.json({ sessions: formattedSessions });
  } catch (error) {
    console.error("Error fetching chat sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat sessions" },
      { status: 500 }
    );
  }
}
