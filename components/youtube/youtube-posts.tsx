"use client";

import { useState } from "react";
import Image from "next/image";
import { YouTubePost } from "@/hooks/use-youtube-channel";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Heart, MessageCircle, ExternalLink, Calendar, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface YouTubePostsProps {
  posts: YouTubePost[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore?: () => void;
  isLoadingMore?: boolean;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
  return `${Math.floor(diffInSeconds / 31536000)}y ago`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export default function YouTubePosts({
  posts,
  isLoading,
  hasMore,
  onLoadMore,
  isLoadingMore = false,
}: YouTubePostsProps) {
  if (isLoading && posts.length === 0) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-card rounded-lg border-2 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <div className="flex gap-4">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>No posts found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <article
          key={post.id}
          className="bg-card rounded-lg border-2 p-6 hover:border-primary/50 transition-colors"
        >
          {/* Post Header */}
          <div className="flex items-start gap-4 mb-4">
            {post.authorThumbnail ? (
              <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                <Image
                  src={post.authorThumbnail}
                  alt={post.author}
                  fill
                  className="object-cover"
                  sizes="40px"
                  unoptimized
                />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-medium text-muted-foreground">
                  {post.author.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground">{post.author}</h3>
                <span className="text-xs text-muted-foreground">•</span>
                <time className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(post.publishedAt)}
                </time>
              </div>
            </div>
          </div>

          {/* Post Content */}
          <div className="mb-4">
            <p className="text-foreground whitespace-pre-wrap leading-relaxed">
              {post.text}
            </p>
          </div>

          {/* Post Images */}
          {post.images && post.images.length > 0 && (
            <div className={cn(
              "mb-4 grid gap-2",
              post.images.length === 1 ? "grid-cols-1" : "grid-cols-2"
            )}>
              {post.images.map((image, idx) => (
                <div key={idx} className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                  <Image
                    src={image}
                    alt={`Post image ${idx + 1}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 50vw"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          )}

          {/* Embedded Video */}
          {post.videoId && (
            <div className="mb-4">
              <a
                href={`https://www.youtube.com/watch?v=${post.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block group"
              >
                <div className="flex gap-3 p-3 border rounded-lg hover:bg-accent transition-colors">
                  {post.videoThumbnail && (
                    <div className="relative w-32 h-20 rounded overflow-hidden bg-muted flex-shrink-0">
                      <Image
                        src={post.videoThumbnail}
                        alt={post.videoTitle || "Video"}
                        fill
                        className="object-cover"
                        sizes="128px"
                        unoptimized
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                      {post.videoTitle || "Watch on YouTube"}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <ExternalLink className="h-3 w-3" />
                      <span>youtube.com</span>
                    </div>
                  </div>
                </div>
              </a>
            </div>
          )}

          {/* Post Actions */}
          <div className="flex items-center gap-6 pt-4 border-t">
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Heart className="h-4 w-4" />
              <span>{formatNumber(post.likeCount)}</span>
            </button>
            <button className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <MessageCircle className="h-4 w-4" />
              <span>{formatNumber(post.commentCount)}</span>
            </button>
          </div>
        </article>
      ))}

      {/* Load More */}
      {hasMore && onLoadMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={isLoadingMore}
            className="cursor-pointer"
          >
            {isLoadingMore ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </Button>
        </div>
      )}
    </div>
  );
}

