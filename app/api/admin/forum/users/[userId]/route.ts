import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

// GET - Get user details
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    await requireAdmin();
    const { userId } = await params;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        avatarUrl: true,
        role: true,
        isForumAdmin: true,
        isForumModerator: true,
        isBanned: true,
        bannedAt: true,
        bannedUntil: true,
        banReason: true,
        createdAt: true,
        _count: {
          select: {
            forumPosts: true,
            forumReplies: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Failed to fetch user" },
      { status: 500 }
    );
  }
}

// PATCH - Update user role or ban status
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const moderator = await requireAdmin();
    const { userId } = await params;
    const body = await request.json();
    const { role, isForumAdmin, isForumModerator, isBanned, bannedUntil, banReason } = body;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updateData: any = {};

    if (role !== undefined) {
      updateData.role = role;
    }

    if (isForumAdmin !== undefined) {
      updateData.isForumAdmin = isForumAdmin;
    }

    if (isForumModerator !== undefined) {
      updateData.isForumModerator = isForumModerator;
    }

    if (isBanned !== undefined) {
      updateData.isBanned = isBanned;
      if (isBanned) {
        updateData.bannedAt = new Date();
        updateData.banReason = banReason || null;
        if (bannedUntil) {
          updateData.bannedUntil = new Date(bannedUntil);
        } else {
          updateData.bannedUntil = null;
        }
      } else {
        updateData.bannedAt = null;
        updateData.bannedUntil = null;
        updateData.banReason = null;
      }
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        isForumAdmin: true,
        isForumModerator: true,
        isBanned: true,
        bannedAt: true,
        bannedUntil: true,
        banReason: true,
      },
    });

    // Log moderation action
    await db.forumModerationAction.create({
      data: {
        moderatorId: moderator.id,
        actionType: isBanned ? "BAN_USER" : "UPDATE_USER",
        targetType: "USER",
        targetId: userId,
        reason: banReason || null,
        notes: JSON.stringify(updateData),
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}

