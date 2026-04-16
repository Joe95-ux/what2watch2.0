import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { generateBeamsToken, isBeamsConfigured } from "@/lib/pusher/beams-server";

export async function GET(request: NextRequest) {
  try {
    if (!isBeamsConfigured()) {
      return NextResponse.json({ error: "Beams is not configured" }, { status: 503 });
    }

    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true, pushNotifications: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.pushNotifications === false) {
      return NextResponse.json({ error: "Push notifications are disabled" }, { status: 403 });
    }

    const requestedUserId = new URL(request.url).searchParams.get("user_id");
    if (requestedUserId !== user.id) {
      return NextResponse.json({ error: "Inconsistent user" }, { status: 401 });
    }

    return NextResponse.json(generateBeamsToken(user.id));
  } catch (error) {
    console.error("[BeamsAuth] Failed to generate token:", error);
    return NextResponse.json({ error: "Failed to authorize Beams" }, { status: 500 });
  }
}
