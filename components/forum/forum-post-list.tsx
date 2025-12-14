"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ForumPostCardReddit } from "./forum-post-card-reddit";
import { SimplePagination } from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare } from "lucide-react";

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
  score: number;
  replyCount: number;
  slug?: string;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ForumPostsResponse {
  posts: ForumPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function ForumPostList() {
  const searchParams = useSearchParams();
  const [currentPage, setCurrentPage] = useState(1);

  const tag = searchParams.get("tag");
  const category = searchParams.get("category");
  const categoryId = searchParams.get("categoryId");
  const search = searchParams.get("search");
  const tmdbId = searchParams.get("tmdbId");
  const mediaType = searchParams.get("mediaType");
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const order = searchParams.get("order") || "desc";

  const { data, isLoading, error } = useQuery<ForumPostsResponse>({
    queryKey: ["forum-posts", currentPage, tag, category, categoryId, search, tmdbId, mediaType, sortBy, order],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "20",
        sortBy,
        order,
      });
      if (tag) params.set("tag", tag);
      if (category) params.set("category", category);
      if (categoryId) params.set("categoryId", categoryId);
      if (search) params.set("search", search);
      if (tmdbId) params.set("tmdbId", tmdbId);
      if (mediaType) params.set("mediaType", mediaType);

      const response = await fetch(`/api/forum/posts?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to fetch forum posts");
      }
      return response.json();
    },
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [tag, category, categoryId, search, tmdbId, mediaType, sortBy, order]);

  if (isLoading) {
    return (
      <div className="space-y-0 border border-border rounded-lg overflow-hidden">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex gap-2 p-3 border-b border-border/50 last:border-b-0">
            <div className="flex flex-col items-center gap-1 pt-1">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-4 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load forum posts. Please try again.</p>
      </div>
    );
  }

  if (!data || data.posts.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed rounded-lg">
        <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold tracking-tight mb-2">No posts yet</h2>
        <p className="text-muted-foreground">
          Be the first to start a discussion!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {data.posts.map((post) => (
        <ForumPostCardReddit key={post.id} post={post} />
      ))}
      {data.pagination.totalPages > 1 && (
        <SimplePagination
          currentPage={currentPage}
          totalPages={data.pagination.totalPages}
          onPageChange={setCurrentPage}
        />
      )}
    </div>
  );
}

