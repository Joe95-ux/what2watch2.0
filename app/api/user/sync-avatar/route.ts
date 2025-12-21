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

    // Update database first (source of truth)
    try {
      await db.user.update({
        where: { clerkId: userId },
        data: {
          avatarUrl: avatarUrl,
        },
      });
      console.log(`[Avatar Sync] Database updated for user ${userId}`);
    } catch (error) {
      console.error("Error updating database avatar:", error);
      return NextResponse.json(
        { error: "Failed to update database avatar" },
        { status: 500 }
      );
    }

    // Update Clerk user's image
    // Note: Clerk may not always send webhooks for programmatic updates via API
    // The webhook is primarily for user-initiated changes through Clerk's UI
    try {
      const client = await clerkClient();
      const updatedUser = await client.users.updateUser(userId, {
        imageUrl: avatarUrl,
      });
      
      // Verify the update was successful
      if (updatedUser.imageUrl !== avatarUrl) {
        console.warn(`[Avatar Sync] Clerk update may have failed - expected ${avatarUrl}, got ${updatedUser.imageUrl}`);
      } else {
        console.log(`[Avatar Sync] Clerk updated successfully for user ${userId}`);
      }
    } catch (error) {
      console.error("Error updating Clerk user avatar:", error);
      // Don't fail the request - database is already updated
      // Clerk UI might not reflect the change immediately, but database is correct
      // The webhook will sync it back if Clerk is updated through their UI
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

