import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { resolveMaxChatQuestions } from "@/lib/subscription";

// GET - Get current user's database ID and basic info
export async function GET(request: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();

    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bannerUrl: true,
        bannerGradientId: true,
        role: true,
        isForumAdmin: true,
        isForumModerator: true,
        pushNotifications: true,
        chatQuota: true,
        stripeSubscriptionStatus: true,
        stripeSubscriptionCurrentPeriodEnd: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const aiChatQuestionCount = await db.aiChatEvent.count({
      where: { userId: user.id },
    });

    const maxQuestions = resolveMaxChatQuestions(user.chatQuota, user.stripeSubscriptionStatus);

    return NextResponse.json({
      user: {
        ...user,
        aiChatQuestionCount,
        aiChatMaxQuestions: maxQuestions,
      },
    });
  } catch (error) {
    console.error("Error fetching current user:", error);
    return NextResponse.json(
      { error: "Failed to fetch current user" },
      { status: 500 }
    );
  }
}

