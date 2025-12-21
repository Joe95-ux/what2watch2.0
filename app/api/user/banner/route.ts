import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { bannerUrl, bannerGradientId } = body;

    // Find user
    const user = await db.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update banner
    await db.user.update({
      where: { clerkId: userId },
      data: {
        bannerUrl: bannerUrl || null,
        bannerGradientId: bannerGradientId || null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating banner:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update banner" },
      { status: 500 }
    );
  }
}

