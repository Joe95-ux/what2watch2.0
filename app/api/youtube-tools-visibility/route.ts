import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export type YoutubeToolsVisibilityMode = "HIDDEN_FROM_ALL" | "AVAILABLE_TO_ALL" | "INVITE_ONLY";

/**
 * GET - Returns whether the current user should see the full YouTube tools dropdown or just a link to YouTube.
 * Public endpoint (no auth required); hasAccess is false when not signed in or when tools are hidden/restricted.
 */
export async function GET() {
  try {
    const config = await db.youtubeToolsVisibility.findFirst();
    const mode: YoutubeToolsVisibilityMode =
      (config?.mode as YoutubeToolsVisibilityMode) || "AVAILABLE_TO_ALL";
    const allowedEmails = config?.allowedEmails ?? [];

    if (mode === "HIDDEN_FROM_ALL") {
      return NextResponse.json({ mode, hasAccess: false });
    }
    if (mode === "AVAILABLE_TO_ALL") {
      return NextResponse.json({ mode, hasAccess: true });
    }

    // INVITE_ONLY: check current user email
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ mode, hasAccess: false });
    }
    const user = await db.user.findUnique({
      where: { clerkId: userId },
      select: { email: true },
    });
    if (!user) {
      return NextResponse.json({ mode, hasAccess: false });
    }
    const emailLower = user.email?.toLowerCase().trim() ?? "";
    const hasAccess = allowedEmails.some((e: string) => e.toLowerCase().trim() === emailLower);
    return NextResponse.json({ mode, hasAccess });
  } catch (error) {
    console.error("youtube-tools-visibility GET error:", error);
    return NextResponse.json(
      { error: "Failed to get YouTube tools visibility" },
      { status: 500 }
    );
  }
}
