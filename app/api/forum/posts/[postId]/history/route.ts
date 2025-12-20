import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { getPostRevisions } from "@/lib/services/forum-post-history.service";

interface RouteParams {
  params: Promise<{ postId: string }>;
}

/**
 * GET - Get revision history for a post
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { postId } = await params;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

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

    const revisions = await getPostRevisions(post.id, limit);

    return NextResponse.json({ revisions });
  } catch (error) {
    console.error("Error fetching post history:", error);
    return NextResponse.json(
      { error: "Failed to fetch post history" },
      { status: 500 }
    );
  }
}

