import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET - Get current user's watchlist public status
export async function GET(request: NextRequest): Promise<NextResponse<{ isPublic: boolean } | { error: string }>> {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true, watchlistIsPublic: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ isPublic: user.watchlistIsPublic ?? true });
  } catch (error) {
    console.error("Get watchlist public status API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch watchlist public status";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// PATCH - Update watchlist public status
export async function PATCH(request: NextRequest): Promise<NextResponse<{ success: boolean; isPublic: boolean } | { error: string }>> {
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
    const { isPublic } = body;

    if (typeof isPublic !== "boolean") {
      return NextResponse.json(
        { error: "isPublic must be a boolean" },
        { status: 400 }
      );
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data: { watchlistIsPublic: isPublic },
      select: { watchlistIsPublic: true },
    });

    return NextResponse.json({
      success: true,
      isPublic: updated.watchlistIsPublic ?? true,
    });
  } catch (error) {
    console.error("Update watchlist public status API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update watchlist public status";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

