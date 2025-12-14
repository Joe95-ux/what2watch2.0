"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowBigUp, MessageCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PopularPost {
  id: string;
  slug?: string;
  title: string;
  score: number;
  replyCount: number;
  category?: {
    id: string;
    name: string;
    slug: string;
    color?: string;
    icon?: string | null;
  } | null;
}

export function PopularTopics() {
  const { data, isLoading } = useQuery({
    queryKey: ["forum-popular-topics"],
    queryFn: async () => {
      const response = await fetch("/api/forum/posts?page=1&limit=10&sortBy=score&order=desc");
      if (!response.ok) return { posts: [] };
      const data = await response.json();
      return data;
    },
  });

  const posts = data?.posts || [];

  const getCategoryColor = (color?: string | null) => {
    if (!color) return "bg-blue-500/20 text-blue-700 dark:text-blue-400";
    
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

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-background">
        <div className="p-4 border-b">
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-4 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (posts.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="p-4 border-b">
        <h3 className="text-sm font-semibold">Popular Topics</h3>
      </div>
      <div className="divide-y divide-border">
        {posts.map((post: PopularPost) => (
          <Link
            key={post.id}
            href={post.slug ? `/forum/${post.slug}` : `/forum/${post.id}`}
            className="block p-4 hover:bg-accent/50 transition-colors"
          >
            <div className="space-y-2">
              {/* Category */}
              {post.category && (
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded text-xs font-medium",
                      getCategoryColor(post.category.color)
                    )}
                    style={post.category.color ? {
                      backgroundColor: `${post.category.color}20`,
                      color: post.category.color,
                    } : undefined}
                  >
                    {post.category.icon && <span className="mr-1">{post.category.icon}</span>}
                    {post.category.name}
                  </span>
                </div>
              )}
              
              {/* Title */}
              <h4 className="text-sm font-medium line-clamp-2 hover:text-primary transition-colors">
                {post.title}
              </h4>
              
              {/* Stats */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <ArrowBigUp className="h-3 w-3" />
                  <span>{post.score > 0 ? post.score : 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  <span>{post.replyCount || 0}</span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

