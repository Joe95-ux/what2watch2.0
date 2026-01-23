import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

/**
 * Update a trend alert
 * PATCH /api/youtube/alerts/[alertId]
 * Body: { isActive?: boolean, minMomentum?: number, minSearchVolume?: number }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { alertId: string } }
) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const alert = await db.trendAlert.findUnique({
      where: { id: params.alertId },
    });

    if (!alert) {
      return NextResponse.json(
        { error: "Alert not found" },
        { status: 404 }
      );
    }

    if (alert.userId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const updateData: any = {};

    if (typeof body.isActive === "boolean") {
      updateData.isActive = body.isActive;
    }

    if (typeof body.minMomentum === "number" && body.minMomentum >= 0) {
      updateData.minMomentum = body.minMomentum;
    }

    if (typeof body.minSearchVolume === "number" && body.minSearchVolume >= 0) {
      updateData.minSearchVolume = body.minSearchVolume;
    }

    const updated = await db.trendAlert.update({
      where: { id: params.alertId },
      data: updateData,
    });

    return NextResponse.json({ alert: updated });
  } catch (error) {
    console.error("Error updating trend alert:", error);
    return NextResponse.json(
      { error: "Failed to update trend alert" },
      { status: 500 }
    );
  }
}

/**
 * Delete a trend alert
 * DELETE /api/youtube/alerts/[alertId]
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { alertId: string } }
) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    const alert = await db.trendAlert.findUnique({
      where: { id: params.alertId },
    });

    if (!alert) {
      return NextResponse.json(
        { error: "Alert not found" },
        { status: 404 }
      );
    }

    if (alert.userId !== user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    await db.trendAlert.delete({
      where: { id: params.alertId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting trend alert:", error);
    return NextResponse.json(
      { error: "Failed to delete trend alert" },
      { status: 500 }
    );
  }
}
