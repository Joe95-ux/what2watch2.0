import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export type YoutubeToolsVisibilityMode = "HIDDEN_FROM_ALL" | "AVAILABLE_TO_ALL" | "INVITE_ONLY";

function isAdmin(role: string | null) {
  return role === "ADMIN" || role === "SUPER_ADMIN";
}

/**
 * GET - Returns full config (mode, allowedEmails). Admin/Super Admin only.
 */
export async function GET() {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { role: true },
    });
    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const config = await db.youtubeToolsVisibility.findFirst();
    const mode: YoutubeToolsVisibilityMode =
      (config?.mode as YoutubeToolsVisibilityMode) || "AVAILABLE_TO_ALL";
    const allowedEmails = config?.allowedEmails ?? [];
    return NextResponse.json({ mode, allowedEmails });
  } catch (error) {
    console.error("admin youtube-tools-visibility GET error:", error);
    return NextResponse.json(
      { error: "Failed to get YouTube tools visibility" },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Update mode and/or allowedEmails. Admin/Super Admin only.
 */
export async function PATCH(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { role: true },
    });
    if (!user || !isAdmin(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { mode, allowedEmails } = body as {
      mode?: YoutubeToolsVisibilityMode;
      allowedEmails?: string[];
    };

    const validModes: YoutubeToolsVisibilityMode[] = ["HIDDEN_FROM_ALL", "AVAILABLE_TO_ALL", "INVITE_ONLY"];
    const updates: { mode?: string; allowedEmails?: string[] } = {};
    if (mode != null && validModes.includes(mode)) {
      updates.mode = mode;
    }
    if (allowedEmails != null && Array.isArray(allowedEmails)) {
      updates.allowedEmails = allowedEmails
        .map((e) => (typeof e === "string" ? e.trim().toLowerCase() : ""))
        .filter(Boolean);
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No valid updates" }, { status: 400 });
    }

    const existing = await db.youtubeToolsVisibility.findFirst();
    if (existing) {
      await db.youtubeToolsVisibility.update({
        where: { id: existing.id },
        data: updates,
      });
    } else {
      await db.youtubeToolsVisibility.create({
        data: {
          mode: (updates.mode as YoutubeToolsVisibilityMode) ?? "AVAILABLE_TO_ALL",
          allowedEmails: updates.allowedEmails ?? [],
        },
      });
    }

    const config = await db.youtubeToolsVisibility.findFirst();
    return NextResponse.json({
      mode: (config?.mode as YoutubeToolsVisibilityMode) ?? "AVAILABLE_TO_ALL",
      allowedEmails: config?.allowedEmails ?? [],
    });
  } catch (error) {
    console.error("admin youtube-tools-visibility PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update YouTube tools visibility" },
      { status: 500 }
    );
  }
}
