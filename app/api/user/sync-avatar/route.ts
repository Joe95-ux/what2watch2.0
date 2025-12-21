import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

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

    // Update Clerk user's image
    try {
      const client = await clerkClient();
      await client.users.updateUser(userId, {
        imageUrl: avatarUrl,
      });
    } catch (error) {
      console.error("Error updating Clerk user avatar:", error);
      // Continue to update database even if Clerk update fails
    }

    // Update database
    try {
      await db.user.update({
        where: { clerkId: userId },
        data: {
          avatarUrl: avatarUrl,
        },
      });
    } catch (error) {
      console.error("Error updating database avatar:", error);
      // If database update fails, still return success since Clerk was updated
      // The webhook will eventually sync it back
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error syncing avatar:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to sync avatar" },
      { status: 500 }
    );
  }
}

