import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface RouteParams {
  params: Promise<{ postId: string }>;
}

/**
 * GET - Get updates since a timestamp (for polling)
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { postId } = await params;
    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since");

    if (!since) {
      return NextResponse.json({ updates: [] });
    }

    const sinceDate = new Date(since);

    // Check if postId is an ObjectId or slug
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(postId);
    
    let post;
    if (isObjectId) {
      post = await db.forumPost.findUnique({
        where: { id: postId },
        select: { id: true },
      });
    } else {
      post = await db.forumPost.findFirst({
        where: { slug: postId },
        select: { id: true },
      });
    }

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Get new replies
    const newReplies = await db.forumReply.findMany({
      where: {
        postId: post.id,
        isHidden: false,
        createdAt: { gt: sinceDate },
      },
      select: {
        id: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // Get new reactions (simplified - could be enhanced)
    const newReactions = await db.forumPostReaction.findMany({
      where: {
        postId: post.id,
        createdAt: { gt: sinceDate },
      },
      select: {
        id: true,
        reactionType: true,
        createdAt: true,
      },
    });

    const updates = [
      ...newReplies.map((reply) => ({
        type: "reply" as const,
        postId: post.id,
        replyId: reply.id,
        timestamp: reply.createdAt,
        data: { id: reply.id },
      })),
      ...newReactions.map((reaction) => ({
        type: "reaction" as const,
        postId: post.id,
        timestamp: reaction.createdAt,
        data: { reactionType: reaction.reactionType },
      })),
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return NextResponse.json({ updates });
  } catch (error) {
    console.error("Error fetching updates:", error);
    return NextResponse.json(
      { error: "Failed to fetch updates" },
      { status: 500 }
    );
  }
}

