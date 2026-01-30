import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET(): Promise<NextResponse<{ links: unknown[] } | { error: string }>> {
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

    const links = await db.userLink.findMany({
      where: { userId: user.id },
      orderBy: { order: "asc" },
      select: {
        id: true,
        label: true,
        url: true,
        order: true,
        isActive: true,
        icon: true,
        resourceType: true,
        resourceId: true,
        clicks: true,
      },
    });

    return NextResponse.json({ links });
  } catch (error) {
    console.error("Get user links API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch links" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse<{ link: unknown } | { error: string }>> {
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
    const { label, url, icon, resourceType, resourceId } = body as {
      label?: string;
      url?: string;
      icon?: string | null;
      resourceType?: string | null;
      resourceId?: string | null;
    };

    if (!label?.trim() || !url?.trim()) {
      return NextResponse.json(
        { error: "Label and URL are required" },
        { status: 400 }
      );
    }

    const maxOrder = await db.userLink.findFirst({
      where: { userId: user.id },
      orderBy: { order: "desc" },
      select: { order: true },
    });
    const order = (maxOrder?.order ?? -1) + 1;

    const link = await db.userLink.create({
      data: {
        userId: user.id,
        label: label.trim(),
        url: url.trim(),
        order,
        icon: icon?.trim() || null,
        resourceType: resourceType?.trim() || null,
        resourceId: resourceId?.trim() || null,
      },
      select: {
        id: true,
        label: true,
        url: true,
        order: true,
        isActive: true,
        icon: true,
        resourceType: true,
        resourceId: true,
      },
    });

    return NextResponse.json({ link });
  } catch (error) {
    console.error("Create user link API error:", error);
    return NextResponse.json(
      { error: "Failed to create link" },
      { status: 500 }
    );
  }
}
