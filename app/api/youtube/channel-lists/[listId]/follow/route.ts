import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveCurrentUserId } from "../../helpers";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const { userId: currentUserId } = await resolveCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { listId } = await params;
    const list = await db.youTubeChannelList.findUnique({
      where: { id: listId },
      select: { id: true, userId: true },
    });

    if (!list || !list.id) {
      return NextResponse.json({ error: "List not found" }, { status: 404 });
    }

    if (list.userId === currentUserId) {
      return NextResponse.json(
        { error: "You cannot follow your own list" },
        { status: 400 }
      );
    }

    const existingFollow = await db.youTubeChannelListFollow.findUnique({
      where: {
        listId_userId: {
          listId,
          userId: currentUserId,
        },
      },
      select: { id: true },
    });

    if (existingFollow) {
      await db.$transaction([
        db.youTubeChannelListFollow.delete({
          where: { id: existingFollow.id },
        }),
        db.youTubeChannelList.update({
          where: { id: listId },
          data: {
            followersCount: {
              decrement: 1,
            },
          },
        }),
      ]);
      return NextResponse.json({ isFollowing: false });
    }

    await db.$transaction([
      db.youTubeChannelListFollow.create({
        data: {
          listId,
          userId: currentUserId,
        },
      }),
      db.youTubeChannelList.update({
        where: { id: listId },
        data: {
          followersCount: {
            increment: 1,
          },
        },
      }),
    ]);

    return NextResponse.json({ isFollowing: true });
  } catch (error) {
    console.error("[YouTubeChannelLists] follow toggle error", error);
    return NextResponse.json(
      { error: "Failed to update follow state" },
      { status: 500 }
    );
  }
}

