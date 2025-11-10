import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest): Promise<NextResponse<{ success: boolean } | { error: string }>> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { favoriteGenres, preferredTypes, onboardingCompleted } = body;

    // Find or create user
    let user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      // Create user if doesn't exist
      const clerkUser = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
        },
      }).then((res) => res.json());

      user = await db.user.create({
        data: {
          clerkId: userId,
          email: clerkUser.email_addresses[0]?.email_address || "",
          displayName: clerkUser.first_name || clerkUser.username || null,
          username: clerkUser.username || null,
          avatarUrl: clerkUser.image_url || null,
        },
      });
    }

    // Update or create preferences
    await db.userPreferences.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        favoriteGenres: favoriteGenres || [],
        preferredTypes: preferredTypes || [],
        onboardingCompleted: onboardingCompleted ?? false,
      },
      update: {
        favoriteGenres: favoriteGenres || [],
        preferredTypes: preferredTypes || [],
        onboardingCompleted: onboardingCompleted ?? false,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Preferences API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to save preferences";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function GET(): Promise<NextResponse<{ preferences: unknown } | { error: string }>> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { clerkId: userId },
      include: { preferences: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      preferences: user.preferences || null,
    });
  } catch (error) {
    console.error("Get preferences API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to fetch preferences";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

