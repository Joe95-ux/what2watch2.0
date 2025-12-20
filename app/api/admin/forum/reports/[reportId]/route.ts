import { NextRequest, NextResponse } from "next/server";
import { requireModerator } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { sendEmail } from "@/lib/email";
import { getReportReviewedEmail } from "@/lib/email-templates";

interface RouteParams {
  params: Promise<{ reportId: string }>;
}

// PATCH - Review a report (approve/reject)
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    await requireModerator();
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const moderator = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!moderator) {
      return NextResponse.json({ error: "Moderator not found" }, { status: 404 });
    }

    const { reportId } = await params;
    const body = await request.json();
    const { action, reviewNotes, targetType } = body; // action: "approve" | "reject", targetType: "post" | "reply"

    if (!action || !targetType) {
      return NextResponse.json(
        { error: "Action and targetType are required" },
        { status: 400 }
      );
    }

    const updateData: any = {
      status: action === "approve" ? "reviewed" : "reviewed",
      reviewedById: moderator.id,
      reviewedAt: new Date(),
      reviewNotes: reviewNotes || null,
    };

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    if (targetType === "post") {
      const report = await db.forumPostReport.findUnique({
        where: { id: reportId },
        include: { 
          post: { 
            include: { 
              user: { select: { id: true, email: true, displayName: true, username: true, emailNotifications: true } },
            },
          },
        },
      });

      if (!report) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }

      await db.forumPostReport.update({
        where: { id: reportId },
        data: updateData,
      });

      // If approved, take action on the post
      if (action === "approve") {
        await db.forumPost.update({
          where: { id: report.postId },
          data: {
            isHidden: true,
            hiddenAt: new Date(),
            hiddenById: moderator.id,
          },
        });
      }

      // Send email notification to post owner
      if (report.post.user.emailNotifications && report.post.user.email) {
        const emailHtml = getReportReviewedEmail({
          contentOwnerName: report.post.user.username || report.post.user.displayName || "User",
          contentType: "post",
          contentTitle: report.post.title,
          action: action === "approve" ? "approved" : "rejected",
          reviewNotes: reviewNotes || undefined,
          viewContentUrl: `${baseUrl}/forum/${report.post.slug || report.post.id}`,
          appealUrl: `${baseUrl}/dashboard/reports`,
        });

        await sendEmail({
          to: report.post.user.email,
          subject: action === "approve" ? "Report Review - Action Taken" : "Report Review - Dismissed",
          html: emailHtml,
        });
      }
    } else if (targetType === "reply") {
      const report = await db.forumReplyReport.findUnique({
        where: { id: reportId },
        include: { 
          reply: { 
            include: { 
              user: { select: { id: true, email: true, displayName: true, username: true, emailNotifications: true } },
              post: { select: { id: true, slug: true, title: true } },
            },
          },
        },
      });

      if (!report) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 });
      }

      await db.forumReplyReport.update({
        where: { id: reportId },
        data: updateData,
      });

      // If approved, take action on the reply
      if (action === "approve") {
        await db.forumReply.update({
          where: { id: report.replyId },
          data: {
            isHidden: true,
            hiddenAt: new Date(),
            hiddenById: moderator.id,
          },
        });
      }

      // Send email notification to reply owner
      if (report.reply.user.emailNotifications && report.reply.user.email) {
        const emailHtml = getReportReviewedEmail({
          contentOwnerName: report.reply.user.username || report.reply.user.displayName || "User",
          contentType: "reply",
          action: action === "approve" ? "approved" : "rejected",
          reviewNotes: reviewNotes || undefined,
          viewContentUrl: `${baseUrl}/forum/${report.reply.post.slug || report.reply.post.id}`,
          appealUrl: `${baseUrl}/dashboard/reports`,
        });

        await sendEmail({
          to: report.reply.user.email,
          subject: action === "approve" ? "Report Review - Action Taken" : "Report Review - Dismissed",
          html: emailHtml,
        });
      }
    } else {
      return NextResponse.json({ error: "Invalid targetType" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error reviewing report:", error);
    return NextResponse.json(
      { error: "Failed to review report" },
      { status: 500 }
    );
  }
}

