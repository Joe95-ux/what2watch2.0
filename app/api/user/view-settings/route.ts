import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET - Get user's view settings
export async function GET(): Promise<NextResponse<{ settings: unknown } | { error: string }>> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: {
        id: true,
        youtubeCardStyle: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      settings: {
        youtubeCardStyle: user.youtubeCardStyle || "centered",
      },
    });
  } catch (error) {
    console.error("Get view settings API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch view settings" },
      { status: 500 }
    );
  }
}

// POST - Update user's view settings
export async function POST(request: NextRequest): Promise<NextResponse<{ success: boolean } | { error: string }>> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { youtubeCardStyle } = body;

    if (youtubeCardStyle && !["centered", "horizontal"].includes(youtubeCardStyle)) {
      return NextResponse.json(
        { error: "Invalid card style. Must be 'centered' or 'horizontal'" },
        { status: 400 }
      );
    }

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

    // Update user's view settings
    await db.user.update({
      where: { id: user.id },
      data: {
        ...(youtubeCardStyle !== undefined && { youtubeCardStyle }),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update view settings API error:", error);
    return NextResponse.json(
      { error: "Failed to update view settings" },
      { status: 500 }
    );
  }
}
