import { Suspense } from "react";
import type { Metadata } from "next";
import { ForumPostDetailClient } from "@/components/forum/forum-post-detail-client";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/db";
import { buildShareMetadata } from "@/lib/seo/metadata";

// Force dynamic rendering since forum layout uses useSearchParams()
export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ postId: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { postId } = await params;
  const isObjectId = /^[0-9a-fA-F]{24}$/.test(postId);

  const post = isObjectId
    ? await db.forumPost.findUnique({
        where: { id: postId },
        select: { id: true, slug: true, title: true, content: true, status: true, isHidden: true },
      })
    : await db.forumPost.findFirst({
        where: { slug: postId },
        select: { id: true, slug: true, title: true, content: true, status: true, isHidden: true },
      });

  if (!post || post.isHidden || post.status !== "PUBLIC") {
    return {
      title: "Forum post | What2Watch",
      description: "Join the discussion on What2Watch.",
      robots: { index: false, follow: false },
    };
  }

  const plainContent = post.content
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const description = plainContent
    ? plainContent.length > 160
      ? `${plainContent.slice(0, 157).trimEnd()}...`
      : plainContent
    : "Join the discussion on What2Watch.";

  return buildShareMetadata({
    title: post.title,
    description,
    path: `/forum/${post.slug || post.id}`,
  });
}

function ForumPostDetailFallback() {
  // Minimal fallback - let client components handle their own loading states
  return null;
}

export default function ForumPostDetailPage() {
  return (
    <Suspense fallback={<ForumPostDetailFallback />}>
      <ForumPostDetailClient />
    </Suspense>
  );
}

