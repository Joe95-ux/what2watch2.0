"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ArrowLeft, MessageSquare, Eye, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ForumReplyList } from "./forum-reply-list";
import { CreateReplyForm } from "./create-reply-form";
import { ForumLikeButton } from "./forum-like-button";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface ForumPost {
  id: string;
  title: string;
  content: string;
  tags: string[];
  tmdbId?: number;
  mediaType?: string;
  category?: {
    id: string;
    name: string;
    slug: string;
    color?: string;
  } | null;
  views: number;
  likes: number;
  replyCount: number;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  replies: ForumReply[];
  createdAt: string;
  updatedAt: string;
}

interface ForumReply {
  id: string;
  content: string;
  likes: number;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  parentReplyId?: string;
  replies: ForumReply[];
  createdAt: string;
  updatedAt: string;
}

export function ForumPostDetailClient() {
  const params = useParams();
  const router = useRouter();
  const { isSignedIn } = useUser();
  const postId = params.postId as string;

  const { data, isLoading, error } = useQuery<{ post: ForumPost }>({
    queryKey: ["forum-post", postId],
    queryFn: async () => {
      const response = await fetch(`/api/forum/posts/${postId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch forum post");
      }
      return response.json();
    },
  });

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-32 w-full" />
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-12">
            <p className="text-destructive">Failed to load post. Please try again.</p>
            <Button
              onClick={() => router.push("/forum")}
              variant="outline"
              className="mt-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Forums
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { post } = data;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => router.push("/forum")}
          className="mb-6 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Forums
        </Button>

        {/* Post Content */}
        <article className="bg-card border border-border rounded-lg p-6 mb-6">
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={post.author.avatarUrl} alt={post.author.displayName} />
              <AvatarFallback>{getInitials(post.author.displayName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4 mb-2">
                <h1 className="text-2xl font-bold">{post.title}</h1>
                <span className="text-sm text-muted-foreground flex-shrink-0">
                  {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
                </span>
              </div>
              <Link
                href={`/users/${post.author.username || post.author.id}`}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                by {post.author.displayName}
              </Link>
            </div>
          </div>

          {/* Category */}
          {post.category && (
            <div className="mb-4">
              <Link
                href={`/forum?category=${post.category.slug}`}
                className={cn(
                  "inline-flex items-center px-3 py-1 text-sm rounded-full font-medium transition-colors",
                  post.category.color
                    ? `bg-[${post.category.color}]/10 text-[${post.category.color}] hover:bg-[${post.category.color}]/20`
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                )}
                style={
                  post.category.color
                    ? {
                        backgroundColor: `${post.category.color}15`,
                        color: post.category.color,
                      }
                    : undefined
                }
              >
                {post.category.name}
              </Link>
            </div>
          )}

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/forum?tag=${encodeURIComponent(tag)}`}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-xs rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                </Link>
              ))}
            </div>
          )}

          {/* Content */}
          <div className="prose prose-sm dark:prose-invert max-w-none mb-4">
            <p className="whitespace-pre-wrap">{post.content}</p>
          </div>

          {/* Meta Info */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground pt-4 border-t">
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{post.views} views</span>
            </div>
            <ForumLikeButton postId={post.id} variant="post" />
            <div className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              <span>{post.replyCount} replies</span>
            </div>
          </div>
        </article>

        {/* Replies Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">
            Replies ({post.replyCount})
          </h2>

          {/* Create Reply Form */}
          {isSignedIn && (
            <CreateReplyForm postId={postId} />
          )}

          {/* Replies List */}
          <ForumReplyList replies={post.replies} postId={postId} />
        </div>
      </div>
    </div>
  );
}

