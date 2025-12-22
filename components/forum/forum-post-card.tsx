"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Eye, Tag } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ForumLikeButton } from "./forum-like-button";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAvatar } from "@/contexts/avatar-context";
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
  createdAt: string;
  updatedAt: string;
}

interface ForumPostCardProps {
  post: ForumPost;
}

export function ForumPostCard({ post }: ForumPostCardProps) {
  const { data: currentUser } = useCurrentUser();
  const { avatarUrl: contextAvatarUrl } = useAvatar();
  const isAuthor = currentUser?.id === post.author.id;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Link
      href={`/forum/${post.id}`}
      className="block p-6 bg-card border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
    >
      <div className="flex items-start gap-4">
        {/* Author Avatar */}
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage 
            src={isAuthor && contextAvatarUrl ? contextAvatarUrl : post.author.avatarUrl} 
            alt={post.author.username || post.author.displayName} 
          />
          <AvatarFallback>{getInitials(post.author.username || post.author.displayName)}</AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h3 className="text-lg font-semibold line-clamp-2">{post.title}</h3>
            <span className="text-sm text-muted-foreground flex-shrink-0">
              {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
            </span>
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {post.content}
          </p>

          {/* Category */}
          {post.category && (
            <div className="mb-3">
              <Link
                href={`/forum?category=${post.category.slug}`}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                  "inline-flex items-center px-2 py-1 text-xs rounded-full font-medium transition-colors",
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
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {post.tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/forum?tag=${encodeURIComponent(tag)}`}
                  onClick={(e) => e.stopPropagation()}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-xs rounded-full hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                </Link>
              ))}
            </div>
          )}

          {/* Meta Info */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <Link
              href={`/users/${post.author.username || post.author.id}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:text-primary transition-colors"
            >
              {post.author.username || post.author.displayName}
            </Link>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span>{post.views}</span>
              </div>
              <ForumLikeButton postId={post.id} initialScore={post.likes} />
              <div className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                <span>{post.replyCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

