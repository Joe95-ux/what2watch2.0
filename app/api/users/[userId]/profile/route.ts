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
  console.log("[API /users/[userId]/profile] Route handler called");
  try {
    const { userId: identifier } = await params;

    console.log("[API /users/[userId]/profile] Backend received params:", {
      identifier,
      type: typeof identifier,
      isNull: identifier === null,
      isUndefined: identifier === undefined,
      isEmpty: identifier === "",
      trimmed: identifier?.trim(),
    });

    if (!identifier?.trim()) {
      console.log("[API /users/[userId]/profile] Error: identifier is empty or invalid");
      return NextResponse.json(
        { error: "User identifier is required" },
        { status: 400 }
      );
    }

    const cleanIdentifier = identifier.trim();
    console.log("[API /users/[userId]/profile] Clean identifier:", cleanIdentifier);
    let user: userProfile | null = null;

    // find by username first
    console.log("[API /users/[userId]/profile] Attempting username lookup:", cleanIdentifier);
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

    console.log("[API /users/[userId]/profile] Username lookup result:", user ? { id: user.id, username: user.username, displayName: user.displayName } : "not found");

    const validObjectId = assertObjectId(cleanIdentifier);
    console.log("[API /users/[userId]/profile] Valid ObjectId?", validObjectId);

    if(!user && validObjectId){
      console.log("[API /users/[userId]/profile] Attempting ObjectId lookup:", validObjectId);
      user = await db.user.findUnique({
        where:{id: validObjectId},
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
          bio: true,
          createdAt: true,
        },
      })
      console.log("[API /users/[userId]/profile] ObjectId lookup result:", user ? { id: user.id, username: user.username, displayName: user.displayName } : "not found");
    }

    if (!user) {
      console.log("[API /users/[userId]/profile] User not found for identifier:", cleanIdentifier);
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    console.log("[API /users/[userId]/profile] User found, returning:", {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
    });

    // Get counts using the actual user ID
    console.log("[API /users/[userId]/profile] Fetching counts for user:", user.id);
    try {
      const [followersCount, followingCount, playlistsCount, listsCount] = await Promise.all([
        db.follow.count({ where: { followingId: user.id } }),
        db.follow.count({ where: { followerId: user.id } }),
        db.playlist.count({ where: { userId: user.id } }),
        db.list.count({ where: { userId: user.id, visibility: "PUBLIC" } }), // Only count public lists
      ]);

      console.log("[API /users/[userId]/profile] Counts fetched:", {
        followersCount,
        followingCount,
        playlistsCount,
        listsCount,
      });

      const responseData = {
        user: {
          ...user,
          followersCount,
          followingCount,
          playlistsCount,
          listsCount,
        },
      };

      console.log("[API /users/[userId]/profile] Returning response with user:", {
        id: responseData.user.id,
        username: responseData.user.username,
        displayName: responseData.user.displayName,
        followersCount: responseData.user.followersCount,
        followingCount: responseData.user.followingCount,
        playlistsCount: responseData.user.playlistsCount,
        listsCount: responseData.user.listsCount,
      });

      return NextResponse.json(responseData);
    } catch (countsError) {
      console.error("[API /users/[userId]/profile] Error fetching counts:", countsError);
      throw countsError;
    }
  } catch (error) {
    console.error("[API /users/[userId]/profile] Error fetching user profile:", error);
    console.error("[API /users/[userId]/profile] Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      { error: "Failed to fetch user profile" },
      { status: 500 }
    );
  }
}

