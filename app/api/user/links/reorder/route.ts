import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function PATCH(
  request: NextRequest
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

    const body = await request.json();
    const { linkIds } = body as { linkIds?: string[] };
    if (!Array.isArray(linkIds) || linkIds.length === 0) {
      return NextResponse.json(
        { error: "linkIds array is required" },
        { status: 400 }
      );
    }

    const existingLinks = await db.userLink.findMany({
      where: { id: { in: linkIds }, userId: user.id },
      select: { id: true },
    });
    const validIds = new Set(existingLinks.map((l) => l.id));
    const orderedIds = linkIds.filter((id) => validIds.has(id));
    if (orderedIds.length !== existingLinks.length) {
      return NextResponse.json(
        { error: "Some link IDs are invalid or do not belong to you" },
        { status: 400 }
      );
    }

    await Promise.all(
      orderedIds.map((id, index) =>
        db.userLink.update({
          where: { id },
          data: { order: index },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reorder user links API error:", error);
    return NextResponse.json(
      { error: "Failed to reorder links" },
      { status: 500 }
    );
  }
}
