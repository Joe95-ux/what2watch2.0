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
    const { message, status } = body ?? {};

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
        reason: true,
        message: true,
        status: true,
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

    // Create a new reply (allow multiple replies)
    const reply = await db.feedbackReply.create({
      data: {
        feedbackId,
        message: message.trim(),
        status: status || null, // Optional status at time of reply
        repliedById: user.id,
      },
    });

    // Update feedback status if provided (manual status change)
    const updateData: any = {};
    if (status && status !== feedback.status) {
      updateData.status = status;
    }

    if (Object.keys(updateData).length > 0) {
      await db.feedback.update({
        where: { id: feedbackId },
        data: updateData,
      });
    }

    // Send email to user with the reply
    const userName = feedback.user?.displayName || feedback.user?.username || "User";
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    
    console.log("[AdminFeedbackReply] Preparing to send email reply");
    console.log("[AdminFeedbackReply] Feedback ID:", feedbackId);
    console.log("[AdminFeedbackReply] Recipient email:", feedback.userEmail);
    console.log("[AdminFeedbackReply] User name:", userName);
    console.log("[AdminFeedbackReply] Resend domain config:", {
      RESEND_DOMAIN: process.env.RESEND_DOMAIN || "not set",
      expectedDefault: "onboarding@resend.dev",
    });
    
    // Build status message if status changed
    const statusMessage = status && status !== feedback.status
      ? `<p><strong>Status Update:</strong> Your feedback status has been updated to <strong>${status.replace("_", " ")}</strong>.</p>`
      : "";

    const emailContent = getEmailTemplate({
      title: "Update on Your Feedback",
      content: `
        <p>Hi ${userName},</p>
        <p>Thank you for your feedback. Here's an update on your submission:</p>
        ${statusMessage}
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

    console.log("[AdminFeedbackReply] Email content generated, length:", emailContent.length);
    console.log("[AdminFeedbackReply] Calling sendEmail function...");

    // Send email asynchronously (don't block response)
    sendEmail({
      to: feedback.userEmail,
      subject: "Re: Your Feedback on what2watch",
      html: emailContent,
    })
      .then((success) => {
        if (success) {
          console.log("[AdminFeedbackReply] ✓ Email sent successfully to:", feedback.userEmail);
        } else {
          console.error("[AdminFeedbackReply] ✗ Email send returned false for:", feedback.userEmail);
        }
      })
      .catch((error) => {
        console.error("[AdminFeedbackReply] ✗ Failed to send email:", error);
        console.error("[AdminFeedbackReply] Error details:", {
          message: error?.message,
          stack: error?.stack,
          name: error?.name,
        });
      });

    return NextResponse.json({ success: true, reply });
  } catch (error) {
    console.error("[AdminFeedbackReply] POST error", error);
    return NextResponse.json({ error: "Failed to send reply" }, { status: 500 });
  }
}

