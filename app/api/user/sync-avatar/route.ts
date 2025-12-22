import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * API route to update user avatar URL in database
 * Note: Clerk profile image is updated directly from the client using user.setProfileImage()
 * This route only handles database updates
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { avatarUrl } = await request.json();

    if (!avatarUrl || typeof avatarUrl !== "string") {
      return NextResponse.json(
        { error: "Invalid avatar URL" },
        { status: 400 }
      );
    }

    // Update database with avatar URL
    await db.user.update({
      where: { clerkId: userId },
      data: {
        avatarUrl: avatarUrl,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating database avatar:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update avatar" },
      { status: 500 }
    );
  }
}

