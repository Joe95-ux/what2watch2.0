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

    const tags = await db.feedbackTag.findMany({
      where: { feedbackId },
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
    });

    return NextResponse.json({ tags });
  } catch (error) {
    console.error("[FeedbackTags] GET error", error);
    return NextResponse.json({ error: "Failed to fetch tags" }, { status: 500 });
  }
}

export async function POST(
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
    const { name, color } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json({ error: "Tag name is required" }, { status: 400 });
    }

    // Check if tag already exists for this feedback
    const existingTag = await db.feedbackTag.findFirst({
      where: {
        feedbackId,
        name: name.trim(),
      },
    });

    if (existingTag) {
      return NextResponse.json({ error: "Tag already exists" }, { status: 400 });
    }

    const tag = await db.feedbackTag.create({
      data: {
        feedbackId,
        name: name.trim(),
        color: color || null,
        createdById: user.id,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
      },
    });

    // Create activity log
    await db.feedbackActivity.create({
      data: {
        feedbackId,
        action: "TAG_ADDED",
        description: `Added tag: ${name.trim()}`,
        metadata: { tagName: name.trim() },
        performedById: user.id,
      },
    });

    return NextResponse.json({ tag });
  } catch (error) {
    console.error("[FeedbackTags] POST error", error);
    return NextResponse.json({ error: "Failed to create tag" }, { status: 500 });
  }
}

export async function DELETE(
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
    const { searchParams } = new URL(request.url);
    const tagId = searchParams.get("tagId");

    if (!tagId) {
      return NextResponse.json({ error: "Tag ID is required" }, { status: 400 });
    }

    const tag = await db.feedbackTag.findUnique({
      where: { id: tagId },
    });

    if (!tag || tag.feedbackId !== feedbackId) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    await db.feedbackTag.delete({
      where: { id: tagId },
    });

    // Create activity log
    await db.feedbackActivity.create({
      data: {
        feedbackId,
        action: "TAG_REMOVED",
        description: `Removed tag: ${tag.name}`,
        metadata: { tagName: tag.name },
        performedById: user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[FeedbackTags] DELETE error", error);
    return NextResponse.json({ error: "Failed to delete tag" }, { status: 500 });
  }
}

