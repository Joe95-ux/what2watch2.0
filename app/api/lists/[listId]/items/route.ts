import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// DELETE - Remove item from list
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
): Promise<NextResponse<{ success: boolean } | { error: string }>> {
  try {
    const { userId: clerkUserId } = await auth();
    const { listId } = await params;
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");

    if (!itemId) {
      return NextResponse.json(
        { error: "Missing itemId" },
        { status: 400 }
      );
    }

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if list exists and user owns it
    const list = await db.list.findUnique({
      where: { id: listId },
      select: { userId: true },
    });

    if (!list) {
      return NextResponse.json(
        { error: "List not found" },
        { status: 404 }
      );
    }

    if (list.userId !== user.id) {
      return NextResponse.json(
        { error: "Access denied" },
        { status: 403 }
      );
    }

    // Delete the item
    await db.listItem.delete({
      where: { id: itemId },
    });

    // Re-sequence remaining items
    const remainingItems = await db.listItem.findMany({
      where: { listId },
      orderBy: { position: "asc" },
    });

    // Update positions to be sequential
    await Promise.all(
      remainingItems.map((item, index) =>
        db.listItem.update({
          where: { id: item.id },
          data: { position: index + 1 },
        })
      )
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Remove list item API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to remove item from list";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

