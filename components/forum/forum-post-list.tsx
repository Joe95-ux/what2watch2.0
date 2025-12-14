"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ForumPostCard } from "./forum-post-card";
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
      <div className="space-y-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full" />
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
        <ForumPostCard key={post.id} post={post} />
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

