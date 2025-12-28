"use server";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true, email: true, username: true, displayName: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { reason, priority, message } = body ?? {};

    if (!reason || !priority || !message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "reason, priority, and message are required" },
        { status: 400 }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: "Message must be 2000 characters or less" },
        { status: 400 }
      );
    }

    const feedback = await db.feedback.create({
      data: {
        userId: user.id,
        reason,
        priority,
        message: message.trim(),
        userEmail: user.email,
        username: user.username,
        status: "OPEN",
      },
    });

    // Create notifications for all admins
    const admins = await db.user.findMany({
      where: {
        OR: [
          { role: "ADMIN" },
          { role: "SUPER_ADMIN" },
          { isForumAdmin: true },
        ],
      },
      select: { id: true },
    });

    if (admins.length > 0) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const notifications = admins.map((admin) => ({
        userId: admin.id,
        type: "FEEDBACK_SUBMITTED",
        title: "New Feedback Submitted",
        message: `${user.username || user.displayName || "A user"} submitted feedback: ${reason}`,
        linkUrl: `${baseUrl}/dashboard/admin/forum?tab=feedback`,
        metadata: {
          feedbackId: feedback.id,
          reason,
          priority,
        },
        isRead: false,
      }));

      await db.generalNotification.createMany({
        data: notifications,
      });
    }

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("[Feedback] POST error", error);
    return NextResponse.json({ error: "Failed to submit feedback" }, { status: 500 });
  }
}

