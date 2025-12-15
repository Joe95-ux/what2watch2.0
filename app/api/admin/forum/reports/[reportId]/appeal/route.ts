import { NextRequest, NextResponse } from "next/server";
import { requireModerator } from "@/lib/admin-auth";
import { db } from "@/lib/db";
import { auth } from "@clerk/nextjs/server";
import { sendEmail } from "@/lib/email";
import { getAppealReviewedEmail } from "@/lib/email-templates";

interface RouteParams {
  params: Promise<{ reportId: string }>;
}

// PATCH - Review an appeal (approve/reject)
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
    const { action, reviewNotes, targetType } = body; // action: "approve" | "reject"

    if (!action || !targetType) {
      return NextResponse.json(
        { error: "Action and targetType are required" },
        { status: 400 }
      );
    }

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

      if (action === "approve") {
        // Approve appeal - restore content
        await db.forumPostReport.update({
          where: { id: reportId },
          data: {
            status: "appeal_approved",
            reviewedById: moderator.id,
            reviewedAt: new Date(),
            reviewNotes: reviewNotes || null,
          },
        });

        await db.forumPost.update({
          where: { id: report.postId },
          data: {
            isHidden: false,
            hiddenAt: null,
            hiddenById: null,
          },
        });
      } else {
        // Reject appeal - keep content hidden
        await db.forumPostReport.update({
          where: { id: reportId },
          data: {
            status: "appeal_rejected",
            reviewedById: moderator.id,
            reviewedAt: new Date(),
            reviewNotes: reviewNotes || null,
          },
        });
      }

      // Send email notification to post owner
      if (report.post.user.emailNotifications && report.post.user.email) {
        const emailHtml = getAppealReviewedEmail({
          contentOwnerName: report.post.user.displayName || report.post.user.username || "User",
          contentType: "post",
          contentTitle: report.post.title,
          decision: action === "approve" ? "approved" : "rejected",
          reviewNotes: reviewNotes || undefined,
          viewContentUrl: `${baseUrl}/forum/${report.post.slug || report.post.id}`,
        });

        await sendEmail({
          to: report.post.user.email,
          subject: action === "approve" ? "Appeal Approved" : "Appeal Rejected",
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

      if (action === "approve") {
        // Approve appeal - restore content
        await db.forumReplyReport.update({
          where: { id: reportId },
          data: {
            status: "appeal_approved",
            reviewedById: moderator.id,
            reviewedAt: new Date(),
            reviewNotes: reviewNotes || null,
          },
        });

        await db.forumReply.update({
          where: { id: report.replyId },
          data: {
            isHidden: false,
            hiddenAt: null,
            hiddenById: null,
          },
        });
      } else {
        // Reject appeal - keep content hidden
        await db.forumReplyReport.update({
          where: { id: reportId },
          data: {
            status: "appeal_rejected",
            reviewedById: moderator.id,
            reviewedAt: new Date(),
            reviewNotes: reviewNotes || null,
          },
        });
      }

      // Send email notification to reply owner
      if (report.reply.user.emailNotifications && report.reply.user.email) {
        const emailHtml = getAppealReviewedEmail({
          contentOwnerName: report.reply.user.displayName || report.reply.user.username || "User",
          contentType: "reply",
          decision: action === "approve" ? "approved" : "rejected",
          reviewNotes: reviewNotes || undefined,
          viewContentUrl: `${baseUrl}/forum/${report.reply.post.slug || report.reply.post.id}`,
        });

        await sendEmail({
          to: report.reply.user.email,
          subject: action === "approve" ? "Appeal Approved" : "Appeal Rejected",
          html: emailHtml,
        });
      }
    } else {
      return NextResponse.json({ error: "Invalid targetType" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error reviewing appeal:", error);
    return NextResponse.json(
      { error: "Failed to review appeal" },
      { status: 500 }
    );
  }
}

