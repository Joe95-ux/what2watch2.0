"use server";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET(
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
      select: { role: true, isForumAdmin: true },
    });

    if (!user || (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN" && !user.isForumAdmin)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { feedbackId } = await params;

    const feedback = await db.feedback.findUnique({
      where: { id: feedbackId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        assignedTo: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        replies: {
          include: {
            repliedBy: {
              select: {
                username: true,
                displayName: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        notes: {
          include: {
            createdBy: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        tags: {
          include: {
            createdBy: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        activities: {
          include: {
            performedBy: {
              select: {
                id: true,
                username: true,
                displayName: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 50, // Limit to last 50 activities
        },
      },
    });

    if (!feedback) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    return NextResponse.json({ feedback });
  } catch (error) {
    console.error("[AdminFeedbackDetail] GET error", error);
    return NextResponse.json({ error: "Failed to fetch feedback" }, { status: 500 });
  }
}

