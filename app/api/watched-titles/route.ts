import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET(_request: NextRequest): Promise<NextResponse<{ titles: unknown[] } | { error: string }>> {
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

    const titles = await db.watchedTitle.findMany({
      where: { userId: user.id },
      orderBy: { seenAt: "desc" },
    });

    return NextResponse.json({ titles });
  } catch (error) {
    console.error("watched titles GET error:", error);
    return NextResponse.json({ error: "Failed to fetch watched titles" }, { status: 500 });
  }
}
