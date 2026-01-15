import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET - Get user's forum category preferences
export async function GET(request: NextRequest) {
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

    const preferences = await db.userPreferences.findUnique({
      where: { userId: user.id },
      select: { forumCategoryIds: true },
    });

    return NextResponse.json({
      categoryIds: preferences?.forumCategoryIds || [],
    });
  } catch (error) {
    console.error("Error fetching forum category preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch category preferences" },
      { status: 500 }
    );
  }
}

// POST - Save user's forum category preferences
export async function POST(request: NextRequest) {
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
    const { categoryIds } = body;

    if (!Array.isArray(categoryIds)) {
      return NextResponse.json(
        { error: "categoryIds must be an array" },
        { status: 400 }
      );
    }

    // Validate that all category IDs exist
    const categories = await db.forumCategory.findMany({
      where: { id: { in: categoryIds }, isActive: true },
      select: { id: true },
    });

    const validCategoryIds = categories.map(c => c.id);
    const invalidIds = categoryIds.filter(id => !validCategoryIds.includes(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: `Invalid category IDs: ${invalidIds.join(", ")}` },
        { status: 400 }
      );
    }

    // Update or create preferences
    await db.userPreferences.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        forumCategoryIds: validCategoryIds,
      },
      update: {
        forumCategoryIds: validCategoryIds,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error saving forum category preferences:", error);
    return NextResponse.json(
      { error: "Failed to save category preferences" },
      { status: 500 }
    );
  }
}

