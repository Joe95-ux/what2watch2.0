"use server";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

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
      select: { assignedToId: true },
    });

    if (!currentFeedback) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    // Validate assigned user if provided
    if (assignedToId) {
      const assignedUser = await db.user.findUnique({
        where: { id: assignedToId },
        select: { id: true, role: true, isForumAdmin: true, username: true, displayName: true },
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

    // Create activity log
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
    }

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("[FeedbackAssign] PATCH error", error);
    return NextResponse.json({ error: "Failed to assign feedback" }, { status: 500 });
  }
}

