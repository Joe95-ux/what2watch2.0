import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// DELETE - Remove a viewing log entry
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
): Promise<NextResponse<{ success: boolean } | { error: string }>> {
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

    const { logId } = await params;

    // Verify the log belongs to the user
    const log = await db.viewingLog.findUnique({
      where: { id: logId },
      select: { userId: true },
    });

    if (!log) {
      return NextResponse.json({ error: "Viewing log not found" }, { status: 404 });
    }

    if (log.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.viewingLog.delete({
      where: { id: logId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete viewing log API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to delete viewing log";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// PATCH - Update a viewing log entry (e.g., update notes or watched date)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
): Promise<NextResponse<{ success: boolean; log?: unknown } | { error: string }>> {
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

    const { logId } = await params;
    const body = await request.json();

    // Verify the log belongs to the user
    const existingLog = await db.viewingLog.findUnique({
      where: { id: logId },
      select: { userId: true },
    });

    if (!existingLog) {
      return NextResponse.json({ error: "Viewing log not found" }, { status: 404 });
    }

    if (existingLog.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Prepare update data
    const updateData: {
      watchedAt?: Date;
      notes?: string | null;
    } = {};

    if (body.watchedAt) {
      updateData.watchedAt = new Date(body.watchedAt);
    }

    if (body.notes !== undefined) {
      updateData.notes = body.notes || null;
    }

    const log = await db.viewingLog.update({
      where: { id: logId },
      data: updateData,
    });

    return NextResponse.json({ success: true, log });
  } catch (error) {
    console.error("Update viewing log API error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to update viewing log";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

