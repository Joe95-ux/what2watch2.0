"use server";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { sendEmail, getEmailTemplate } from "@/lib/email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ feedbackId: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true, role: true, isForumAdmin: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && !user.isForumAdmin)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { feedbackId } = await params;
    const body = await request.json();
    const { message } = body ?? {};

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    const feedback = await db.feedback.findUnique({
      where: { id: feedbackId },
      select: { 
        id: true, 
        userEmail: true, 
        adminReply: true,
        reason: true,
        message: true,
        user: {
          select: {
            displayName: true,
            username: true,
          },
        },
      },
    });

    if (!feedback) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    if (feedback.adminReply) {
      return NextResponse.json(
        { error: "Feedback already has a reply" },
        { status: 400 }
      );
    }

    // Update feedback with admin reply
    await db.feedback.update({
      where: { id: feedbackId },
      data: {
        adminReply: message.trim(),
        repliedAt: new Date(),
        repliedById: user.id,
        status: "RESOLVED",
      },
    });

    // Send email to user with the reply
    const userName = feedback.user?.displayName || feedback.user?.username || "User";
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    
    const emailContent = getEmailTemplate({
      title: "Response to Your Feedback",
      content: `
        <p>Hi ${userName},</p>
        <p>Thank you for your feedback. We've reviewed it and here's our response:</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0; white-space: pre-wrap;">${message.trim()}</p>
        </div>
        <p>Your original feedback:</p>
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 6px; margin: 20px 0;">
          <p style="margin: 0 0 10px 0;"><strong>Reason:</strong> ${feedback.reason}</p>
          <p style="margin: 0; white-space: pre-wrap;">${feedback.message}</p>
        </div>
        <p>If you have any further questions or concerns, please don't hesitate to reach out.</p>
      `,
      footerText: "This is an automated message from what2watch. Please do not reply to this email.",
    });

    // Send email asynchronously (don't block response)
    sendEmail({
      to: feedback.userEmail,
      subject: "Re: Your Feedback on what2watch",
      html: emailContent,
    }).catch((error) => {
      console.error("[AdminFeedbackReply] Failed to send email:", error);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[AdminFeedbackReply] POST error", error);
    return NextResponse.json({ error: "Failed to send reply" }, { status: 500 });
  }
}

