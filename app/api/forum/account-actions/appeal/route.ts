import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// POST - Submit an appeal for ban or suspension
export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true, email: true, emailNotifications: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { appealReason, actionType } = body;

    if (!appealReason || !actionType) {
      return NextResponse.json(
        { error: "Appeal reason and action type are required" },
        { status: 400 }
      );
    }

    if (appealReason.trim().length < 10) {
      return NextResponse.json(
        { error: "Appeal reason must be at least 10 characters long" },
        { status: 400 }
      );
    }

    const updateData: any = {};

    if (actionType === "ban") {
      const currentUser = await db.user.findUnique({
        where: { id: user.id },
        select: { isBanned: true, banAppealStatus: true },
      });

      if (!currentUser?.isBanned) {
        return NextResponse.json(
          { error: "You are not currently banned" },
          { status: 400 }
        );
      }

      if (currentUser.banAppealStatus && currentUser.banAppealStatus !== "rejected") {
        return NextResponse.json(
          { error: "You have already submitted an appeal for this ban" },
          { status: 400 }
        );
      }

      updateData.banAppealReason = appealReason.trim();
      updateData.banAppealAt = new Date();
      updateData.banAppealStatus = "pending";
    } else if (actionType === "suspend") {
      const currentUser = await db.user.findUnique({
        where: { id: user.id },
        select: { isSuspended: true, suspendAppealStatus: true },
      });

      if (!currentUser?.isSuspended) {
        return NextResponse.json(
          { error: "You are not currently suspended" },
          { status: 400 }
        );
      }

      if (currentUser.suspendAppealStatus && currentUser.suspendAppealStatus !== "rejected") {
        return NextResponse.json(
          { error: "You have already submitted an appeal for this suspension" },
          { status: 400 }
        );
      }

      updateData.suspendAppealReason = appealReason.trim();
      updateData.suspendAppealAt = new Date();
      updateData.suspendAppealStatus = "pending";
    } else {
      return NextResponse.json(
        { error: "Invalid action type" },
        { status: 400 }
      );
    }

    await db.user.update({
      where: { id: user.id },
      data: updateData,
    });

    // Notify admins/moderators
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const admins = await db.user.findMany({
      where: {
        OR: [
          { isForumAdmin: true },
          { isForumModerator: true },
        ],
        emailNotifications: true,
      },
      select: { email: true },
    });

    // TODO: Send email notifications to admins about the appeal

    return NextResponse.json({
      success: true,
      message: "Appeal submitted successfully",
    });
  } catch (error: any) {
    console.error("Error submitting appeal:", error);
    return NextResponse.json(
      { error: "Failed to submit appeal" },
      { status: 500 }
    );
  }
}

