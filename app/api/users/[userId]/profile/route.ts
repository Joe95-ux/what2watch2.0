import { NextRequest, NextResponse } from "next/server";
import {assertObjectId} from "@/lib/assert-objectId";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// GET - Get user profile (supports both username and userId)
type userProfile = Prisma.UserGetPayload<{
  select: {
    id: true,
    username: true,
    displayName: true,
    avatarUrl: true,
    bio: true,
    createdAt: true,
  };
}>

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: identifier } = await params;

    if (!identifier?.trim()) {
      return NextResponse.json(
        { error: "User identifier is required" },
        { status: 400 }
      );
    }

    const cleanIdentifier = identifier.trim();
    let user: userProfile | null = null;

    // find by username first
    user = await db.user.findFirst({
      where: {
        username: cleanIdentifier
      },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        bannerUrl: true,
        bannerGradientId: true,
        bio: true,
        createdAt: true,
      },
    });

    const validObjectId = assertObjectId(cleanIdentifier);

    if(!user && validObjectId){
      user = await db.user.findUnique({
        where:{id: validObjectId},
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          bannerUrl: true,
          bannerGradientId: true,
          bio: true,
          createdAt: true,
        },
      })
    }

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Get counts using the actual user ID
    try {
      const [followersCount, followingCount, playlistsCount, listsCount] = await Promise.all([
        db.follow.count({ where: { followingId: user.id } }),
        db.follow.count({ where: { followerId: user.id } }),
        db.playlist.count({ where: { userId: user.id } }),
        db.list.count({ where: { userId: user.id, visibility: "PUBLIC" } }), // Only count public lists
      ]);

      const responseData = {
        user: {
          ...user,
          followersCount,
          followingCount,
          playlistsCount,
          listsCount,
        },
      };

      return NextResponse.json(responseData);
    } catch (countsError) {
      console.error("[API /users/[userId]/profile] Error fetching counts:", countsError);
      throw countsError;
    }
  } catch (error) {
    console.error("[API /users/[userId]/profile] Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}

