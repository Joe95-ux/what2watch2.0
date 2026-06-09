import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { recordPickDismiss } from "@/lib/pick-for-tonight/history";
import type { PickMedia } from "@/lib/pick-for-tonight/media";

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const body = (await request.json()) as {
      tmdbId?: unknown;
      mediaType?: unknown;
    };

    const tmdbId = typeof body.tmdbId === "number" ? body.tmdbId : Number(body.tmdbId);
    if (!Number.isFinite(tmdbId)) {
      return NextResponse.json({ error: "Invalid tmdbId" }, { status: 400 });
    }

    const mediaType: PickMedia =
      body.mediaType === "tv" ? "tv" : body.mediaType === "movie" ? "movie" : "movie";

    await recordPickDismiss(user.id, tmdbId, mediaType);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("pick-for-tonight/dismiss error:", error);
    return NextResponse.json({ error: "Failed to dismiss pick" }, { status: 500 });
  }
}
