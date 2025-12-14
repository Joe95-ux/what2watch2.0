import { auth } from "@clerk/nextjs/server";
import { db } from "./db";
import { NextResponse } from "next/server";

export async function requireAdmin() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    throw new Error("Unauthorized");
  }

  const user = await db.user.findUnique({
    where: { clerkId: clerkUserId },
    select: {
      id: true,
      role: true,
      isForumAdmin: true,
      isForumModerator: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Check if user is admin or super admin
  const isAdmin =
    user.role === "ADMIN" ||
    user.role === "SUPER_ADMIN" ||
    user.isForumAdmin === true;

  if (!isAdmin) {
    throw new Error("Forbidden: Admin access required");
  }

  return user;
}

export async function requireModerator() {
  const { userId: clerkUserId } = await auth();

  if (!clerkUserId) {
    throw new Error("Unauthorized");
  }

  const user = await db.user.findUnique({
    where: { clerkId: clerkUserId },
    select: {
      id: true,
      role: true,
      isForumAdmin: true,
      isForumModerator: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // Check if user is moderator, admin, or super admin
  const isModerator =
    user.role === "ADMIN" ||
    user.role === "SUPER_ADMIN" ||
    user.isForumAdmin === true ||
    user.isForumModerator === true;

  if (!isModerator) {
    throw new Error("Forbidden: Moderator access required");
  }

  return user;
}

export async function checkIsAdmin(clerkUserId: string | null): Promise<boolean> {
  if (!clerkUserId) return false;

  try {
    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: {
        role: true,
        isForumAdmin: true,
      },
    });

    if (!user) return false;

    return (
      user.role === "ADMIN" ||
      user.role === "SUPER_ADMIN" ||
      user.isForumAdmin === true
    );
  } catch {
    return false;
  }
}

export async function checkIsModerator(clerkUserId: string | null): Promise<boolean> {
  if (!clerkUserId) return false;

  try {
    const user = await db.user.findUnique({
      where: { clerkId: clerkUserId },
      select: {
        role: true,
        isForumAdmin: true,
        isForumModerator: true,
      },
    });

    if (!user) return false;

    return (
      user.role === "ADMIN" ||
      user.role === "SUPER_ADMIN" ||
      user.isForumAdmin === true ||
      user.isForumModerator === true
    );
  } catch {
    return false;
  }
}

