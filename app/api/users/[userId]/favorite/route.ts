import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// POST - Bookmark a member (add to favorites)
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { userId: memberId } = await params;

    if (currentUser.id === memberId) {
      return NextResponse.json(
        { error: "Cannot bookmark yourself" },
        { status: 400 }
      );
    }

    const member = await db.user.findUnique({
      where: { id: memberId },
      select: { id: true },
    });

    if (!member) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    await db.favoriteMember.upsert({
      where: {
        bookmarkedById_memberId: {
          bookmarkedById: currentUser.id,
          memberId,
        },
      },
      create: {
        bookmarkedById: currentUser.id,
        memberId,
      },
      update: {},
    });

    return NextResponse.json({ success: true, bookmarked: true });
  } catch (error) {
    console.error("Error bookmarking member:", error);
    return NextResponse.json(
      { error: "Failed to bookmark member" },
      { status: 500 }
    );
  }
}

// DELETE - Remove member from favorites
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { userId: memberId } = await params;

    const deleted = await db.favoriteMember.deleteMany({
      where: {
        bookmarkedById: currentUser.id,
        memberId,
      },
    });

    if (deleted.count === 0) {
      return NextResponse.json(
        { error: "Member not in favorites" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, bookmarked: false });
  } catch (error) {
    console.error("Error unbookmarking member:", error);
    return NextResponse.json(
      { error: "Failed to remove from favorites" },
      { status: 500 }
    );
  }
}

// GET - Check if current user has bookmarked this member
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ bookmarked: false });
    }

    const currentUser = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!currentUser) {
      return NextResponse.json({ bookmarked: false });
    }

    const { userId: memberId } = await params;

    const favorite = await db.favoriteMember.findUnique({
      where: {
        bookmarkedById_memberId: {
          bookmarkedById: currentUser.id,
          memberId,
        },
      },
    });

    return NextResponse.json({ bookmarked: !!favorite });
  } catch (error) {
    console.error("Error checking bookmark status:", error);
    return NextResponse.json({ bookmarked: false });
  }
}
