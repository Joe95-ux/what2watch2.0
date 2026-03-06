import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

// GET - Fetch users with chat quota info
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { role: true, isForumAdmin: true },
    });

    if (!currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "SUPER_ADMIN" && !currentUser.isForumAdmin)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const sortField = searchParams.get("sortField") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (search) {
      where.$or = [
        { username: { $regex: search, $options: "i" } },
        { displayName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    // Get users with their question counts
    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        chatQuota: true,
        createdAt: true,
      },
      skip,
      take: limit,
      orderBy: sortField === "questionCount" 
        ? { createdAt: sortOrder as "asc" | "desc" }
        : { [sortField]: sortOrder as "asc" | "desc" },
    });

    // Get question counts for each user
    const usersWithCounts = await Promise.all(
      users.map(async (user) => {
        const questionCount = await db.aiChatEvent.count({
          where: { userId: user.id },
        });

        // Determine max questions
        let maxQuestions: number;
        if (user.chatQuota === null) {
          maxQuestions = 6; // Default
        } else if (user.chatQuota === -1) {
          maxQuestions = -1; // Unlimited
        } else {
          maxQuestions = user.chatQuota;
        }

        return {
          ...user,
          questionCount,
          maxQuestions,
        };
      })
    );

    // If sorting by questionCount, sort the results
    if (sortField === "questionCount") {
      usersWithCounts.sort((a, b) => {
        if (sortOrder === "asc") {
          return a.questionCount - b.questionCount;
        } else {
          return b.questionCount - a.questionCount;
        }
      });
    }

    // Get total count
    const total = await db.user.count({ where });

    return NextResponse.json({
      users: usersWithCounts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get chat quota users error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// PATCH - Update user chat quota
export async function PATCH(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentUser = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { role: true, isForumAdmin: true },
    });

    if (!currentUser || (currentUser.role !== "ADMIN" && currentUser.role !== "SUPER_ADMIN" && !currentUser.isForumAdmin)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, chatQuota } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (chatQuota === undefined) {
      return NextResponse.json({ error: "chatQuota is required" }, { status: 400 });
    }

    // Validate chatQuota: null, -1 (unlimited), or positive number
    if (chatQuota !== null && chatQuota !== -1 && (typeof chatQuota !== "number" || chatQuota < 0)) {
      return NextResponse.json(
        { error: "chatQuota must be null, -1 (unlimited), or a positive number" },
        { status: 400 }
      );
    }

    const updatedUser = await db.user.update({
      where: { id: userId },
      data: { chatQuota },
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        chatQuota: true,
      },
    });

    // Get question count
    const questionCount = await db.aiChatEvent.count({
      where: { userId: updatedUser.id },
    });

    let maxQuestions: number;
    if (updatedUser.chatQuota === null) {
      maxQuestions = 6;
    } else if (updatedUser.chatQuota === -1) {
      maxQuestions = -1;
    } else {
      maxQuestions = updatedUser.chatQuota;
    }

    return NextResponse.json({
      user: {
        ...updatedUser,
        questionCount,
        maxQuestions,
      },
    });
  } catch (error) {
    console.error("Update chat quota error:", error);
    return NextResponse.json(
      { error: "Failed to update chat quota" },
      { status: 500 }
    );
  }
}
