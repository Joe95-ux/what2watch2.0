"use server";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

const VALID_STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

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
    const { status } = body ?? {};

    if (!status || typeof status !== "string" || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: "Valid status is required (OPEN, IN_PROGRESS, RESOLVED, CLOSED)" },
        { status: 400 }
      );
    }

    const feedback = await db.feedback.findUnique({
      where: { id: feedbackId },
      select: { id: true },
    });

    if (!feedback) {
      return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
    }

    await db.feedback.update({
      where: { id: feedbackId },
      data: {
        status,
      },
    });

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error("[AdminFeedbackStatus] PATCH error", error);
    return NextResponse.json({ error: "Failed to update status" }, { status: 500 });
  }
}

