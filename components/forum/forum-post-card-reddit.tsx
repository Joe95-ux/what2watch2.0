"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Eye, ChevronUp, ChevronDown, Hash } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
  createdAt: string;
  updatedAt: string;
}

interface ForumPostCardProps {
  post: ForumPost;
}

export function ForumPostCardReddit({ post }: ForumPostCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const { data: reaction } = useForumPostReaction(post.id);
  const toggleReaction = useToggleForumPostLike(post.id);

  const userReaction = reaction?.reactionType || null;
  const isUpvoted = userReaction === "upvote";
  const isDownvoted = userReaction === "downvote";
  const displayScore = reaction?.score ?? post.score;

  const handleVote = async (type: "upvote" | "downvote") => {
    if (!toggleReaction.mutate) return;
    
    if (userReaction === type) {
      // Remove reaction if clicking the same button
      toggleReaction.mutate({ type: null });
    } else {
      // Set new reaction
      toggleReaction.mutate({ type });
    }
  };

  const postUrl = post.slug ? `/forum/${post.slug}` : `/forum/${post.id}`;

  const getCategoryColor = (color?: string | null) => {
    if (!color) return "bg-blue-500/20 text-blue-700 dark:text-blue-400";
    
    // Vibrant color mapping
    const colorMap: Record<string, string> = {
      "#3B82F6": "bg-blue-500/20 text-blue-700 dark:text-blue-400",
      "#10B981": "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400",
      "#F59E0B": "bg-amber-500/20 text-amber-700 dark:text-amber-400",
      "#EF4444": "bg-red-500/20 text-red-700 dark:text-red-400",
      "#8B5CF6": "bg-violet-500/20 text-violet-700 dark:text-violet-400",
      "#EC4899": "bg-pink-500/20 text-pink-700 dark:text-pink-400",
      "#06B6D4": "bg-cyan-500/20 text-cyan-700 dark:text-cyan-400",
      "#84CC16": "bg-lime-500/20 text-lime-700 dark:text-lime-400",
      "#F97316": "bg-orange-500/20 text-orange-700 dark:text-orange-400",
      "#A855F7": "bg-purple-500/20 text-purple-700 dark:text-purple-400",
    };
    
    return colorMap[color] || `bg-[${color}]/20 text-[${color}]`;
  };

  return (
    <div className="flex gap-2 p-3 hover:bg-accent/50 transition-colors border-b border-border/50 last:border-b-0">
      {/* Vote Buttons - Reddit style */}
      <div className="flex flex-col items-center gap-1 pt-1">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 p-0 hover:bg-orange-500/10 hover:text-orange-500",
            isUpvoted && "text-orange-500 bg-orange-500/10"
          )}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleVote("upvote");
          }}
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
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            handleVote("downvote");
          }}
        >
          <ChevronDown className="h-5 w-5" />
        </Button>
      </div>

      {/* Post Content */}
      <div className="flex-1 min-w-0">
        <Link href={postUrl} className="block">
          {/* Post Header */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
            {post.category && (
              <Link
                href={`/forum?category=${post.category.slug}`}
                onClick={(e) => e.stopPropagation()}
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
              onClick={(e) => e.stopPropagation()}
              className="hover:underline font-medium text-foreground"
            >
              {post.author.displayName}
            </Link>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
          </div>

          {/* Post Title */}
          <h3 className="text-base font-semibold mb-2 hover:text-primary transition-colors line-clamp-2">
            {post.title}
          </h3>

          {/* Post Content Preview */}
          <p className="text-sm text-muted-foreground mb-3 line-clamp-3">
            {post.content}
          </p>

          {/* Tags */}
          {post.tags.length > 0 && (
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {post.tags.slice(0, 3).map((tag) => (
                <Link
                  key={tag}
                  href={`/forum?tag=${encodeURIComponent(tag)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted hover:bg-muted/80 text-xs rounded-full transition-colors"
                >
                  <Hash className="h-3 w-3" />
                  {tag}
                </Link>
              ))}
              {post.tags.length > 3 && (
                <span className="text-xs text-muted-foreground">+{post.tags.length - 3} more</span>
              )}
            </div>
          )}

          {/* Post Actions */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <Link
              href={postUrl}
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 hover:text-primary transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              <span>{post.replyCount} {post.replyCount === 1 ? "comment" : "comments"}</span>
            </Link>
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{post.views} {post.views === 1 ? "view" : "views"}</span>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

