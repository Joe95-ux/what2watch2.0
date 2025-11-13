import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// GET - List all chat sessions for the user
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
    const mode = searchParams.get("mode"); // Optional filter by mode

    const where: Prisma.AiChatSessionWhereInput = {
      userId: user.id,
    };

    if (mode && (mode === "recommendation" || mode === "information")) {
      where.mode = mode;
    }

    const sessions = await db.aiChatSession.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        sessionId: true,
        mode: true,
        title: true,
        createdAt: true,
        updatedAt: true,
        messages: true,
      },
      take: 50, // Limit to 50 most recent sessions
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Error fetching chat sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch chat sessions" },
      { status: 500 }
    );
  }
}

// POST - Create or update a chat session
export async function POST(request: NextRequest) {
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
    const { sessionId, mode, messages, metadata, title } = body;

    if (!sessionId || !mode || !messages) {
      return NextResponse.json(
        { error: "sessionId, mode, and messages are required" },
        { status: 400 }
      );
    }

    // Generate title from first message if not provided
    let sessionTitle = title;
    if (!sessionTitle && Array.isArray(messages) && messages.length > 0) {
      const firstMessage = messages[0];
      if (firstMessage && typeof firstMessage === "object" && "content" in firstMessage) {
        const content = firstMessage.content as string;
        sessionTitle = content.length > 50 ? content.substring(0, 50) + "..." : content;
      }
    }

    const session = await db.aiChatSession.upsert({
      where: { sessionId },
      update: {
        mode,
        messages: messages as Prisma.InputJsonValue,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
        title: sessionTitle,
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        sessionId,
        mode,
        messages: messages as Prisma.InputJsonValue,
        metadata: metadata ? (metadata as Prisma.InputJsonValue) : undefined,
        title: sessionTitle || "New Chat",
      },
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error("Error saving chat session:", error);
    return NextResponse.json(
      { error: "Failed to save chat session" },
      { status: 500 }
    );
  }
}

