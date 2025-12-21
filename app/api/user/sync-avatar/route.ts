import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
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

    // Update Clerk user's image using REST API
    // Note: Clerk SDK's updateUser may not support imageUrl in TypeScript types
    // Using REST API directly to ensure compatibility
    // Note: Clerk may not always send webhooks for programmatic updates via API
    // The webhook is primarily for user-initiated changes through Clerk's UI
    try {
      const clerkSecretKey = process.env.CLERK_SECRET_KEY;
      if (!clerkSecretKey) {
        console.warn("[Avatar Sync] CLERK_SECRET_KEY not set, skipping Clerk update");
      } else {
        const response = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
          method: "PATCH",
          headers: {
            "Authorization": `Bearer ${clerkSecretKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image_url: avatarUrl,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Clerk API error: ${response.status} - ${error}`);
        }

        const updatedUser = await response.json();
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

