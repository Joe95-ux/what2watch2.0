import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export async function GET(): Promise<
  NextResponse<{ linkPage: { bio: string | null; theme: unknown; ogTitle: string | null; ogDescription: string | null; ogImageUrl: string | null } } | { error: string }>
> {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true, linkPage: { select: { bio: true, theme: true, ogTitle: true, ogDescription: true, ogImageUrl: true } } },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const linkPage = user.linkPage ?? { bio: null, theme: null, ogTitle: null, ogDescription: null, ogImageUrl: null };
    return NextResponse.json({
      linkPage: {
        bio: linkPage.bio ?? null,
        theme: linkPage.theme ?? null,
        ogTitle: linkPage.ogTitle ?? null,
        ogDescription: linkPage.ogDescription ?? null,
        ogImageUrl: linkPage.ogImageUrl ?? null,
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
    const { bio, theme, ogTitle, ogDescription, ogImageUrl } = body as {
      bio?: string | null;
      theme?: Record<string, unknown> | null;
      ogTitle?: string | null;
      ogDescription?: string | null;
      ogImageUrl?: string | null;
    };

    const createData: Prisma.LinkPageCreateInput = {
      user: { connect: { id: user.id } },
      ...(bio !== undefined && { bio: bio?.trim() || null }),
      ...(theme !== undefined && { theme: (theme ?? null) as Prisma.InputJsonValue }),
      ...(ogTitle !== undefined && { ogTitle: ogTitle?.trim() || null }),
      ...(ogDescription !== undefined && { ogDescription: ogDescription?.trim() || null }),
      ...(ogImageUrl !== undefined && { ogImageUrl: ogImageUrl?.trim() || null }),
    };
    const updateData: Prisma.LinkPageUpdateInput = {
      ...(bio !== undefined && { bio: bio?.trim() || null }),
      ...(theme !== undefined && { theme: (theme ?? null) as Prisma.InputJsonValue }),
      ...(ogTitle !== undefined && { ogTitle: ogTitle?.trim() || null }),
      ...(ogDescription !== undefined && { ogDescription: ogDescription?.trim() || null }),
      ...(ogImageUrl !== undefined && { ogImageUrl: ogImageUrl?.trim() || null }),
    };
    const linkPage = await db.linkPage.upsert({
      where: { userId: user.id },
      create: createData,
      update: updateData,
      select: { bio: true, theme: true, ogTitle: true, ogDescription: true, ogImageUrl: true },
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
