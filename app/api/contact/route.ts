"use server";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

const VALID_TYPES = ["support", "feedback", "general"];
const VALID_PRIORITIES = ["Low", "Medium", "High", "Urgent"];

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
    const { type, reason, priority, message } = body ?? {};

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: "Valid type is required (support, feedback, general)" },
        { status: 400 }
      );
    }

    if (!reason || !message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "reason and message are required" },
        { status: 400 }
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { error: "Message must be 2000 characters or less" },
        { status: 400 }
      );
    }

    // For support and general, priority is optional
    if (type === "feedback" && (!priority || !VALID_PRIORITIES.includes(priority))) {
      return NextResponse.json(
        { error: "Valid priority is required for feedback" },
        { status: 400 }
      );
    }

    // For feedback, use the existing feedback model
    if (type === "feedback") {
      const feedback = await db.feedback.create({
        data: {
          userId: user.id,
          reason,
          priority: priority!,
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
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
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

      return NextResponse.json({ success: true, feedback });
    }

    // For support and general enquiries, we could create a separate model
    // For now, we'll use the feedback model with a special reason prefix
    const contactReason = type === "support" ? `[SUPPORT] ${reason}` : `[GENERAL] ${reason}`;
    const contactPriority = priority || "Medium";

    const contact = await db.feedback.create({
      data: {
        userId: user.id,
        reason: contactReason,
        priority: contactPriority,
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
      const title = type === "support" ? "New Support Request" : "New General Enquiry";
      
      const notifications = admins.map((admin) => ({
        userId: admin.id,
        type: "FEEDBACK_SUBMITTED",
        title,
        message: `${user.username || user.displayName || "A user"} submitted a ${type} request: ${reason}`,
        linkUrl: `${baseUrl}/dashboard/admin/forum?tab=feedback`,
        metadata: {
          contactId: contact.id,
          type,
          reason,
          priority: contactPriority,
        },
        isRead: false,
      }));

      await db.generalNotification.createMany({
        data: notifications,
      });
    }

    return NextResponse.json({ success: true, contact });
  } catch (error) {
    console.error("[Contact] POST error", error);
    return NextResponse.json({ error: "Failed to submit contact form" }, { status: 500 });
  }
}

