import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET(): Promise<
  NextResponse<{ linkPage: { bio: string | null; theme: unknown } } | { error: string }>
> {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true, linkPage: { select: { bio: true, theme: true } } },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const linkPage = user.linkPage ?? { bio: null, theme: null };
    return NextResponse.json({
      linkPage: {
        bio: linkPage.bio ?? null,
        theme: linkPage.theme ?? null,
      },
    });
  } catch (error) {
    console.error("Get link page API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch link page" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest
): Promise<NextResponse<{ linkPage: unknown } | { error: string }>> {
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
    const { bio, theme } = body as { bio?: string | null; theme?: Record<string, unknown> | null };

    const linkPage = await db.linkPage.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        ...(bio !== undefined && { bio: bio?.trim() || null }),
        ...(theme !== undefined && { theme: theme ?? undefined }),
      },
      update: {
        ...(bio !== undefined && { bio: bio?.trim() || null }),
        ...(theme !== undefined && { theme: theme ?? undefined }),
      },
      select: { bio: true, theme: true },
    });

    return NextResponse.json({ linkPage });
  } catch (error) {
    console.error("Update link page API error:", error);
    return NextResponse.json(
      { error: "Failed to update link page" },
      { status: 500 }
    );
  }
}
