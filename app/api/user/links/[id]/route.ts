import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { deleteByUrl } from "@/lib/cloudinary";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<{ link: unknown } | { error: string }>> {
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

    const { id } = await params;
    const body = await request.json();
    const { label, url, order, isActive, icon, resourceType, resourceId, bannerImageUrl, customDescription, isSensitiveContent } = body as {
      label?: string;
      url?: string;
      order?: number;
      isActive?: boolean;
      icon?: string | null;
      resourceType?: string | null;
      resourceId?: string | null;
      bannerImageUrl?: string | null;
      customDescription?: string | null;
      isSensitiveContent?: boolean;
    };

    const existing = await db.userLink.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    // If banner is being changed or removed, delete old Cloudinary image
    if (existing.bannerImageUrl && bannerImageUrl !== undefined && bannerImageUrl !== existing.bannerImageUrl) {
      await deleteByUrl(existing.bannerImageUrl);
    }

    const data: Record<string, unknown> = {};
    if (label !== undefined) data.label = label.trim();
    if (url !== undefined) data.url = url.trim();
    if (order !== undefined) data.order = order;
    if (isActive !== undefined) data.isActive = isActive;
    if (icon !== undefined) data.icon = icon?.trim() || null;
    if (resourceType !== undefined) data.resourceType = resourceType?.trim() || null;
    if (resourceId !== undefined) data.resourceId = resourceId?.trim() || null;
    if (bannerImageUrl !== undefined) data.bannerImageUrl = bannerImageUrl?.trim() || null;
    if (customDescription !== undefined) data.customDescription = customDescription?.trim() || null;
    if (isSensitiveContent !== undefined) data.isSensitiveContent = isSensitiveContent === true;

    const link = await db.userLink.update({
      where: { id },
      data,
      select: {
        id: true,
        label: true,
        url: true,
        order: true,
        isActive: true,
        icon: true,
        resourceType: true,
        resourceId: true,
        bannerImageUrl: true,
        customDescription: true,
        isSensitiveContent: true,
      },
    });

    return NextResponse.json({ link });
  } catch (error) {
    console.error("Update user link API error:", error);
    return NextResponse.json(
      { error: "Failed to update link" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<{ success: boolean } | { error: string }>> {
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

    const { id } = await params;
    const existing = await db.userLink.findFirst({
      where: { id, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    if (existing.bannerImageUrl) {
      await deleteByUrl(existing.bannerImageUrl);
    }

    await db.userLink.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user link API error:", error);
    return NextResponse.json(
      { error: "Failed to delete link" },
      { status: 500 }
    );
  }
}
