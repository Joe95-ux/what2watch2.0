import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * Get all trend alerts for the current user
 * GET /api/youtube/alerts
 */
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    const alerts = await db.trendAlert.findMany({
      where: {
        userId: user.id,
        ...(activeOnly && { isActive: true }),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ alerts });
  } catch (error) {
    console.error("Error fetching trend alerts:", error);
    return NextResponse.json(
      { error: "Failed to fetch trend alerts" },
      { status: 500 }
    );
  }
}

/**
 * Create a new trend alert
 * POST /api/youtube/alerts
 * Body: { keyword: string, category?: string, minMomentum: number, minSearchVolume: number }
 */
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const { keyword, category, minMomentum, minSearchVolume } = body;

    if (!keyword || typeof keyword !== "string" || keyword.trim().length === 0) {
      return NextResponse.json(
        { error: "keyword is required" },
        { status: 400 }
      );
    }

    if (typeof minMomentum !== "number" || minMomentum < 0) {
      return NextResponse.json(
        { error: "minMomentum must be a non-negative number" },
        { status: 400 }
      );
    }

    if (typeof minSearchVolume !== "number" || minSearchVolume < 0) {
      return NextResponse.json(
        { error: "minSearchVolume must be a non-negative number" },
        { status: 400 }
      );
    }

    // Check if alert already exists for this keyword
    const existing = await db.trendAlert.findFirst({
      where: {
        userId: user.id,
        keyword: keyword.trim(),
        isActive: true,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An active alert for this keyword already exists" },
        { status: 409 }
      );
    }

    const alert = await db.trendAlert.create({
      data: {
        userId: user.id,
        keyword: keyword.trim(),
        category: category || null,
        minMomentum,
        minSearchVolume,
        isActive: true,
      },
    });

    return NextResponse.json({ alert }, { status: 201 });
  } catch (error) {
    console.error("Error creating trend alert:", error);
    return NextResponse.json(
      { error: "Failed to create trend alert" },
      { status: 500 }
    );
  }
}
