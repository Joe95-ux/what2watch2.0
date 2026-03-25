import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET - fetch user's favorite personalities
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const favorites = await db.favoritePersonality.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ favorites });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch favorite personalities";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST - add personality to favorites
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      tmdbPersonId,
      name,
      profilePath,
      knownForDepartment,
      movieCount,
      tvCount,
    }: {
      tmdbPersonId?: number;
      name?: string;
      profilePath?: string | null;
      knownForDepartment?: string | null;
      movieCount?: number | null;
      tvCount?: number | null;
    } = body;

    if (!tmdbPersonId || !name) {
      return NextResponse.json(
        { error: "Missing required fields (tmdbPersonId, name)" },
        { status: 400 },
      );
    }

    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existing = await db.favoritePersonality.findUnique({
      where: {
        userId_tmdbPersonId: {
          userId: user.id,
          tmdbPersonId,
        },
      },
    });
    if (existing) {
      return NextResponse.json({ success: true, favorite: existing });
    }

    const favorite = await db.favoritePersonality.create({
      data: {
        userId: user.id,
        tmdbPersonId,
        name,
        profilePath: profilePath ?? null,
        knownForDepartment: knownForDepartment ?? null,
        movieCount: typeof movieCount === "number" ? movieCount : 0,
        tvCount: typeof tvCount === "number" ? tvCount : 0,
      },
    });

    return NextResponse.json({ success: true, favorite });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to add favorite personality";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE - remove personality from favorites
export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tmdbPersonId = Number(new URL(request.url).searchParams.get("tmdbPersonId"));
    if (!tmdbPersonId || Number.isNaN(tmdbPersonId)) {
      return NextResponse.json({ error: "Missing or invalid tmdbPersonId" }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { clerkId: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await db.favoritePersonality.deleteMany({
      where: {
        userId: user.id,
        tmdbPersonId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to remove favorite personality";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

