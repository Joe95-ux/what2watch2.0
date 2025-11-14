import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// POST - Track user interaction with AI chat results
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
    const { sessionId, interactionType } = body;

    if (!sessionId || !interactionType) {
      return NextResponse.json(
        { error: "sessionId and interactionType are required" },
        { status: 400 }
      );
    }

    if (interactionType !== "click" && interactionType !== "add_to_playlist") {
      return NextResponse.json(
        { error: "interactionType must be 'click' or 'add_to_playlist'" },
        { status: 400 }
      );
    }

    // Find the most recent AI chat event for this session
    const latestEvent = await db.aiChatEvent.findFirst({
      where: {
        userId: user.id,
        sessionId: sessionId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!latestEvent) {
      return NextResponse.json(
        { error: "No chat event found for this session" },
        { status: 404 }
      );
    }

    // Update the event with the interaction
    const updateData: {
      resultsClicked?: { increment: number };
      resultsAddedToPlaylist?: { increment: number };
    } = {};

    if (interactionType === "click") {
      updateData.resultsClicked = { increment: 1 };
    } else if (interactionType === "add_to_playlist") {
      updateData.resultsAddedToPlaylist = { increment: 1 };
    }

    await db.aiChatEvent.update({
      where: { id: latestEvent.id },
      data: updateData,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error tracking AI chat interaction:", error);
    return NextResponse.json(
      { error: "Failed to track interaction" },
      { status: 500 }
    );
  }
}

