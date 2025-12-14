import { NextRequest, NextResponse } from "next/server";
import { requireModerator } from "@/lib/admin-auth";
import { db } from "@/lib/db";

// GET - List all posts with filters for moderation
export async function GET(request: NextRequest) {
  try {
    await requireModerator();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const search = searchParams.get("search") || "";
    const isHidden = searchParams.get("isHidden");
    const isLocked = searchParams.get("isLocked");
    const hasReports = searchParams.get("hasReports");
    const userId = searchParams.get("userId");

    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
      ];
    }

    if (isHidden !== null && isHidden !== undefined) {
      where.isHidden = isHidden === "true";
    }

    if (isLocked !== null && isLocked !== undefined) {
      where.isLocked = isLocked === "true";
    }

    if (hasReports !== null && hasReports !== undefined) {
      if (hasReports === "true") {
        where.reports = { some: {} };
      } else {
        where.reports = { none: {} };
      }
    }

    if (userId) {
      where.userId = userId;
    }

    const [posts, total] = await Promise.all([
      db.forumPost.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              username: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              replies: true,
              reactions: true,
              reports: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      db.forumPost.count({ where }),
    ]);

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    if (error.message === "Unauthorized" || error.message.includes("Forbidden")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Error fetching posts:", error);
    return NextResponse.json(
      { error: "Failed to fetch posts" },
      { status: 500 }
    );
  }
}

