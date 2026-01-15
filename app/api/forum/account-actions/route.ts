import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET - Get current user's ban/suspension status
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: {
        id: true,
        isBanned: true,
        bannedAt: true,
        bannedUntil: true,
        banReason: true,
        banAppealReason: true,
        banAppealAt: true,
        banAppealStatus: true,
        isSuspended: true,
        suspendedAt: true,
        suspendedUntil: true,
        suspendReason: true,
        suspendAppealReason: true,
        suspendAppealAt: true,
        suspendAppealStatus: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Build actions array
    const actions: any[] = [];

    if (user.isBanned) {
      actions.push({
        id: `ban-${user.id}`,
        type: "ban",
        reason: user.banReason,
        actionAt: user.bannedAt,
        until: user.bannedUntil,
        appealReason: user.banAppealReason,
        appealAt: user.banAppealAt,
        appealStatus: user.banAppealStatus || "none",
      });
    }

    if (user.isSuspended) {
      actions.push({
        id: `suspend-${user.id}`,
        type: "suspend",
        reason: user.suspendReason,
        actionAt: user.suspendedAt,
        until: user.suspendedUntil,
        appealReason: user.suspendAppealReason,
        appealAt: user.suspendAppealAt,
        appealStatus: user.suspendAppealStatus || "none",
      });
    }

    return NextResponse.json({ actions });
  } catch (error: any) {
    console.error("Error fetching account actions:", error);
    return NextResponse.json(
      { error: "Failed to fetch account actions" },
      { status: 500 }
    );
  }
}

