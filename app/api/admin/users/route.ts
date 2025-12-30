"use server";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const role = searchParams.get("role");

    const where: any = {
      OR: [
        { role: "ADMIN" },
        { role: "SUPER_ADMIN" },
        { isForumAdmin: true },
      ],
    };

    const users = await db.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        displayName: true,
        email: true,
        role: true,
        isForumAdmin: true,
      },
      orderBy: [
        { role: "asc" },
        { displayName: "asc" },
      ],
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("[AdminUsers] GET error", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

