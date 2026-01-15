import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getAppealSubmittedEmail, getAdminAppealNotificationEmail } from "@/lib/email-templates";

interface RouteParams {
  params: Promise<{ reportId: string }>;
}

// POST - Appeal a report
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { reportId } = await params;
    const body = await request.json();
    const { appealReason, targetType } = body;

    if (!appealReason || !targetType) {
      return NextResponse.json(
        { error: "Appeal reason and targetType are required" },
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

      if (report.post.userId !== user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      await db.forumPostReport.update({
        where: { id: reportId },
        data: {
          status: "appealed",
          appealReason,
          appealAt: new Date(),
        },
      });

      // Send email to content owner
      if (report.post.user.emailNotifications && report.post.user.email) {
        const emailHtml = getAppealSubmittedEmail({
          contentOwnerName: report.post.user.username || report.post.user.displayName || "User",
          contentType: "post",
          contentTitle: report.post.title,
          appealUrl: `${baseUrl}/dashboard/reports`,
        });

        await sendEmail({
          to: report.post.user.email,
          subject: "Appeal Submitted",
          html: emailHtml,
        });
      }

      // Send email to admins/moderators
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

      const contentPreview = report.post.content.length > 200 
        ? report.post.content.substring(0, 200) + "..." 
        : report.post.content;

      for (const admin of admins) {
        if (admin.email) {
          const adminEmailHtml = getAdminAppealNotificationEmail({
            contentType: "post",
            contentTitle: report.post.title,
            contentPreview,
            appealReason,
            reviewUrl: `${baseUrl}/dashboard/admin/forum?tab=reports`,
          });

          await sendEmail({
            to: admin.email,
            subject: "New Appeal Requires Review",
            html: adminEmailHtml,
          });
        }
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

      if (report.reply.userId !== user.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      await db.forumReplyReport.update({
        where: { id: reportId },
        data: {
          status: "appealed",
          appealReason,
          appealAt: new Date(),
        },
      });

      // Send email to content owner
      if (report.reply.user.emailNotifications && report.reply.user.email) {
        const emailHtml = getAppealSubmittedEmail({
          contentOwnerName: report.reply.user.username || report.reply.user.displayName || "User",
          contentType: "reply",
          appealUrl: `${baseUrl}/dashboard/reports`,
        });

        await sendEmail({
          to: report.reply.user.email,
          subject: "Appeal Submitted",
          html: emailHtml,
        });
      }

      // Send email to admins/moderators
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

      const contentPreview = report.reply.content.length > 200 
        ? report.reply.content.substring(0, 200) + "..." 
        : report.reply.content;

      for (const admin of admins) {
        if (admin.email) {
          const adminEmailHtml = getAdminAppealNotificationEmail({
            contentType: "reply",
            contentTitle: report.reply.post.title,
            contentPreview,
            appealReason,
            reviewUrl: `${baseUrl}/dashboard/admin/forum?tab=reports`,
          });

          await sendEmail({
            to: admin.email,
            subject: "New Appeal Requires Review",
            html: adminEmailHtml,
          });
        }
      }
    } else {
      return NextResponse.json({ error: "Invalid targetType" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error appealing report:", error);
    return NextResponse.json(
      { error: "Failed to appeal report" },
      { status: 500 }
    );
  }
}

