"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Eye, Tag, ChevronUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ForumReplyList } from "./forum-reply-list";
import { CreateReplyForm } from "./create-reply-form";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { ForumSidebar } from "./forum-sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { PanelLeft } from "lucide-react";
import { useForumPostReaction, useToggleForumPostLike } from "@/hooks/use-forum-reactions";

interface ForumPost {
  id: string;
  slug?: string;
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
    icon?: string | null;
  } | null;
  views: number;
  score: number;
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
  const { isSignedIn } = useUser();
  const isMobile = useIsMobile();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
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

  const post = data?.post;
  const { data: reaction } = useForumPostReaction(post?.id || "");
  const toggleReaction = useToggleForumPostLike(post?.id || "");

  const userReaction = reaction?.reactionType || null;
  const isUpvoted = userReaction === "upvote";
  const isDownvoted = userReaction === "downvote";
  const displayScore = reaction?.score ?? post?.score ?? 0;

  const handleVote = async (type: "upvote" | "downvote") => {
    if (!toggleReaction.mutate || !post) return;
    
    if (userReaction === type) {
      toggleReaction.mutate({ type: null });
    } else {
      toggleReaction.mutate({ type });
    }
  };

  const getCategoryColor = (color?: string | null) => {
    if (!color) return "bg-blue-500/20 text-blue-700 dark:text-blue-400";
    
    const colorMap: Record<string, string> = {
      "#3B82F6": "bg-blue-500/20 text-blue-700 dark:text-blue-400",
      "#10B981": "bg-green-500/20 text-green-700 dark:text-green-400",
      "#F59E0B": "bg-orange-500/20 text-orange-700 dark:text-orange-400",
      "#EF4444": "bg-red-500/20 text-red-700 dark:text-red-400",
      "#8B5CF6": "bg-purple-500/20 text-purple-700 dark:text-purple-400",
      "#EC4899": "bg-pink-500/20 text-pink-700 dark:text-pink-400",
    };
    
    return colorMap[color] || `bg-[${color}]/20 text-[${color}]`;
  };

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
      <div className="min-h-screen bg-background flex">
        <ForumSidebar 
          mobileOpen={mobileSidebarOpen}
          onMobileOpenChange={setMobileSidebarOpen}
        />
        <div className="flex-1 min-w-0">
          {isMobile && (
            <div className="sticky top-[65px] z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="px-4 py-2 flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileSidebarOpen(true)}
                  className="cursor-pointer h-9 w-9"
                >
                  <PanelLeft className="h-5 w-5" />
                </Button>
                <div className="h-4 w-px bg-border flex-shrink-0" />
                <Skeleton className="h-5 w-32" />
              </div>
            </div>
          )}
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
      </div>
    );
  }

  if (error || !data || !post) {
    return (
      <div className="min-h-screen bg-background flex">
        <ForumSidebar 
          mobileOpen={mobileSidebarOpen}
          onMobileOpenChange={setMobileSidebarOpen}
        />
        <div className="flex-1 min-w-0">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center py-12">
              <p className="text-destructive">Failed to load post. Please try again.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <ForumSidebar 
        mobileOpen={mobileSidebarOpen}
        onMobileOpenChange={setMobileSidebarOpen}
      />

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Mobile Sidebar Trigger */}
        {isMobile && (
          <div className="sticky top-[65px] z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="px-4 py-2 flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileSidebarOpen(true)}
                className="cursor-pointer h-9 w-9"
                aria-label="Toggle sidebar"
              >
                <PanelLeft className="h-5 w-5" />
              </Button>
              <div className="h-4 w-px bg-border flex-shrink-0" />
              <h1 className="text-sm font-semibold">Forum</h1>
            </div>
          </div>
        )}

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Post Content - Reddit Style */}
        <article className="flex gap-3 mb-6">
          {/* Vote Buttons */}
          <div className="flex flex-col items-center gap-1 pt-1">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 p-0 hover:bg-orange-500/10 hover:text-orange-500",
                isUpvoted && "text-orange-500 bg-orange-500/10"
              )}
              onClick={() => handleVote("upvote")}
            >
              <ChevronUp className="h-5 w-5" />
            </Button>
            <span className={cn(
              "text-xs font-semibold min-w-[2rem] text-center",
              isUpvoted && "text-orange-500",
              isDownvoted && "text-blue-500"
            )}>
              {displayScore}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 p-0 hover:bg-blue-500/10 hover:text-blue-500",
                isDownvoted && "text-blue-500 bg-blue-500/10"
              )}
              onClick={() => handleVote("downvote")}
            >
              <ChevronDown className="h-5 w-5" />
            </Button>
          </div>

          {/* Post Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              {post.category && (
                <Link
                  href={`/forum?category=${post.category.slug}`}
                  className={cn(
                    "px-2 py-0.5 rounded text-xs font-medium transition-colors",
                    getCategoryColor(post.category.color)
                  )}
                  style={post.category.color ? {
                    backgroundColor: `${post.category.color}20`,
                    color: post.category.color,
                  } : undefined}
                >
                  {post.category.icon && <span className="mr-1">{post.category.icon}</span>}
                  {post.category.name}
                </Link>
              )}
              <Link
                href={`/users/${post.author.username || post.author.id}`}
                className="hover:underline font-medium text-foreground"
              >
                {post.author.displayName}
              </Link>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
            </div>

            <h1 className="text-2xl font-bold mb-3">{post.title}</h1>

            {/* Tags */}
            {post.tags.length > 0 && (
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                {post.tags.map((tag) => (
                  <Link
                    key={tag}
                    href={`/forum?tag=${encodeURIComponent(tag)}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted hover:bg-muted/80 text-xs rounded-full transition-colors"
                  >
                    <Tag className="h-3 w-3" />
                    {tag}
                  </Link>
                ))}
              </div>
            )}

            {/* Content */}
            <div className="prose prose-sm dark:prose-invert max-w-none mb-4">
              <p className="whitespace-pre-wrap text-sm">{post.content}</p>
            </div>

            {/* Meta Info */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border/50">
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>{post.views} {post.views === 1 ? "view" : "views"}</span>
              </div>
              <div className="flex items-center gap-1">
                <MessageSquare className="h-4 w-4" />
                <span>{post.replyCount} {post.replyCount === 1 ? "comment" : "comments"}</span>
              </div>
            </div>
          </div>
        </article>

        {/* Replies Section */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            {post.replyCount} {post.replyCount === 1 ? "Comment" : "Comments"}
          </h2>

          {/* Create Reply Form */}
          {isSignedIn && (
            <div className="mb-4">
              <CreateReplyForm postId={postId} />
            </div>
          )}

          {/* Replies List */}
          <ForumReplyList replies={post.replies} postId={postId} />
        </div>
        </div>
      </div>
    </div>
  );
}

