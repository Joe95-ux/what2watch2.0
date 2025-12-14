import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

// POST - Make a user admin (only super admins can do this)
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const admin = await requireAdmin();
    
    // Only SUPER_ADMIN can make other users admin
    if (admin.role !== "SUPER_ADMIN" && !admin.isForumAdmin) {
      return NextResponse.json(
        { error: "Only super admins can assign admin roles" },
        { status: 403 }
      );
    }

    const { userId } = await params;
    const body = await request.json();
    const { role = "ADMIN" } = body; // "ADMIN" or "SUPER_ADMIN"

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Prevent making yourself non-admin
    if (userId === admin.id && role !== "ADMIN" && role !== "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Cannot remove your own admin privileges" },
        { status: 400 }
      );
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: {
        role: role,
        isForumAdmin: role === "ADMIN" || role === "SUPER_ADMIN",
        isForumModerator: role === "ADMIN" || role === "SUPER_ADMIN" || role === "MODERATOR",
      },
    });

    // Log moderation action
    await db.forumModerationAction.create({
      data: {
        moderatorId: admin.id,
        actionType: "UPDATE_USER",
        targetType: "USER",
        targetId: userId,
        reason: `Role changed to ${role}`,
        notes: `Assigned by admin (${admin.id})`,
      },
    });

    return NextResponse.json({ user: updatedUser });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error making user admin:", error);
    return NextResponse.json(
      { error: "Failed to make user admin" },
      { status: 500 }
    );
  }
}

