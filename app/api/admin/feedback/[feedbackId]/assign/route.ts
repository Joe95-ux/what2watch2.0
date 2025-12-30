"use server";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { getFeedbackAssignedEmail } from "@/lib/email-templates";

export async function PATCH(
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
    const { assignedToId } = body;

    // Get current feedback to track changes
    const currentFeedback = await db.feedback.findUnique({
      where: { id: feedbackId },
      select: { 
        assignedToId: true,
        reason: true,
        message: true,
        priority: true,
      },
    });

    if (!currentFeedback) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    // Validate assigned user if provided
    let assignedUser = null;
    if (assignedToId) {
      assignedUser = await db.user.findUnique({
        where: { id: assignedToId },
        select: { 
          id: true, 
          role: true, 
          isForumAdmin: true, 
          username: true, 
          displayName: true,
          email: true,
          emailNotifications: true,
          pushNotifications: true,
        },
      });

      if (!assignedUser || (assignedUser.role !== "ADMIN" && assignedUser.role !== "SUPER_ADMIN" && !assignedUser.isForumAdmin)) {
        return NextResponse.json({ error: "Can only assign to admins/moderators" }, { status: 400 });
      }
    }

    const feedback = await db.feedback.update({
      where: { id: feedbackId },
      data: {
        assignedToId: assignedToId || null,
      },
      include: {
        assignedTo: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    // Create activity log and send notifications
    const oldAssigned = currentFeedback.assignedToId;
    if (oldAssigned !== assignedToId) {
      let description = "";
      if (!assignedToId) {
        description = "Unassigned feedback";
      } else if (!oldAssigned) {
        description = `Assigned to ${feedback.assignedTo?.displayName || feedback.assignedTo?.username || "admin"}`;
      } else {
        description = `Reassigned to ${feedback.assignedTo?.displayName || feedback.assignedTo?.username || "admin"}`;
      }

      await db.feedbackActivity.create({
        data: {
          feedbackId,
          action: "ASSIGNED",
          description,
          metadata: {
            oldAssignedToId: oldAssigned,
            newAssignedToId: assignedToId,
          },
          performedById: user.id,
        },
      });

      // Send notification to assigned user if they were assigned (not unassigned)
      if (assignedToId && assignedUser) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const viewFeedbackUrl = `${baseUrl}/dashboard/admin/forum?tab=feedback&view=${feedbackId}`;
        const notificationSettingsUrl = `${baseUrl}/dashboard/settings`;

        // Get the assigner's display name
        const assigner = await db.user.findUnique({
          where: { id: user.id },
          select: { username: true, displayName: true },
        });
        const assignerName = assigner?.displayName || assigner?.username || "Admin";

        // Create push notification
        if (assignedUser.pushNotifications) {
          try {
            await db.generalNotification.create({
              data: {
                userId: assignedUser.id,
                type: "FEEDBACK_ASSIGNED",
                title: "Feedback Assigned to You",
                message: `You've been assigned to handle a ${currentFeedback.priority.toLowerCase()} priority feedback: ${currentFeedback.reason}`,
                linkUrl: viewFeedbackUrl,
                metadata: {
                  feedbackId,
                  assignedById: user.id,
                  priority: currentFeedback.priority,
                  reason: currentFeedback.reason,
                },
                isRead: false,
              },
            });
          } catch (notificationError) {
            // Silently fail - notification creation is not critical
            console.error("Failed to create push notification for feedback assignment:", notificationError);
          }
        }

        // Send email notification
        if (assignedUser.emailNotifications && assignedUser.email) {
          try {
            const emailHtml = getFeedbackAssignedEmail({
              recipientName: assignedUser.displayName || assignedUser.username || "Admin",
              assignedByName: assignerName,
              feedbackReason: currentFeedback.reason,
              feedbackMessage: currentFeedback.message,
              feedbackPriority: currentFeedback.priority,
              viewFeedbackUrl,
              notificationSettingsUrl,
            });

            await sendEmail({
              to: assignedUser.email,
              subject: `Feedback Assigned to You: ${currentFeedback.reason}`,
              html: emailHtml,
            });
          } catch (emailError) {
            // Silently fail - email sending is not critical
            console.error(`Failed to send email notification to ${assignedUser.email}:`, emailError);
          }
        }
      }
    }

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("[FeedbackAssign] PATCH error", error);
    return NextResponse.json({ error: "Failed to assign feedback" }, { status: 500 });
  }
}

