import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getContentReportedEmail } from "@/lib/email-templates";

interface RouteParams {
  params: Promise<{ replyId: string }>;
}

// POST - Report a forum reply
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { replyId } = await params;
    const body = await request.json();
    const { reason, description } = body;

    if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
      return NextResponse.json(
        { error: "Report reason is required" },
        { status: 400 }
      );
    }

    // Get user
    const user = await db.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const reply = await db.forumReply.findUnique({
      where: { id: replyId },
      include: {
        user: { select: { id: true, email: true, displayName: true, username: true, emailNotifications: true } },
        post: { select: { id: true, slug: true, title: true } },
      },
    });
    
    if (!reply) {
      return NextResponse.json({ error: "Reply not found" }, { status: 404 });
    }

    // Check if user already reported this reply
    const existingReport = await db.forumReplyReport.findUnique({
      where: {
        replyId_userId: {
          replyId: reply.id,
          userId: user.id,
        },
      },
    });

    if (existingReport) {
      return NextResponse.json(
        { error: "You have already reported this reply" },
        { status: 400 }
      );
    }

    // Create report
    await db.forumReplyReport.create({
      data: {
        replyId: reply.id,
        userId: user.id,
        reason: reason.trim(),
        description: description?.trim() || null,
      },
    });

    // Send email notification to reply owner (if enabled)
    if (reply.user.emailNotifications && reply.user.email) {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const contentPreview = reply.content.length > 200 ? reply.content.substring(0, 200) + "..." : reply.content;
      
      const emailHtml = getContentReportedEmail({
        contentOwnerName: reply.user.displayName || reply.user.username || "User",
        contentType: "reply",
        contentPreview,
        reportReason: reason.trim(),
        viewContentUrl: `${baseUrl}/forum/${reply.post.slug || reply.post.id}`,
        appealUrl: `${baseUrl}/dashboard/forum/reports`,
      });

      await sendEmail({
        to: reply.user.email,
        subject: "Your Forum Reply Has Been Reported",
        html: emailHtml,
      });
    }

    return NextResponse.json({ success: true, message: "Reply reported successfully" });
  } catch (error) {
    console.error("Error reporting forum reply:", error);
    return NextResponse.json(
      { error: "Failed to report forum reply" },
      { status: 500 }
    );
  }
}

