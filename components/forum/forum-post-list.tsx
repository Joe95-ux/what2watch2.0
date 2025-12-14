"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useInfiniteQuery, type InfiniteData } from "@tanstack/react-query";
import { ForumPostCardReddit } from "./forum-post-card-reddit";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageCircle } from "lucide-react";

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
  const observerTarget = useRef<HTMLDivElement>(null);

  const tag = searchParams.get("tag");
  const category = searchParams.get("category");
  const categoryId = searchParams.get("categoryId");
  const search = searchParams.get("search");
  const tmdbId = searchParams.get("tmdbId");
  const mediaType = searchParams.get("mediaType");
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const order = searchParams.get("order") || "desc";

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery<ForumPostsResponse, Error, InfiniteData<ForumPostsResponse>, readonly unknown[], number>({
    queryKey: ["forum-posts", tag, category, categoryId, search, tmdbId, mediaType, sortBy, order],
    queryFn: async ({ pageParam = 1 }) => {
      const params = new URLSearchParams({
        page: pageParam.toString(),
        limit: "30",
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
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
    initialPageParam: 1,
  });

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) {
      observer.observe(currentTarget);
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Flatten all posts from all pages
  const allPosts = data?.pages.flatMap((page) => page.posts) ?? [];

  if (isLoading) {
    return (
      <div className="space-y-0">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="p-4 rounded-lg border border-border">
            <div className="flex items-start justify-between mb-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-8 w-8" />
            </div>
            <Skeleton className="h-5 w-3/4 mb-2" />
            <Skeleton className="h-4 w-full mb-2" />
            <Skeleton className="h-4 w-2/3 mb-3" />
            <Skeleton className="h-9 w-full rounded-[25px]" />
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

  if (allPosts.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed rounded-lg">
        <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold tracking-tight mb-2">No posts yet</h2>
        <p className="text-muted-foreground">
          Be the first to start a discussion!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {allPosts.map((post) => (
        <ForumPostCardReddit key={post.id} post={post} />
      ))}
      {/* Observer target for infinite scroll */}
      <div ref={observerTarget} className="h-4" />
      {/* Loading indicator when fetching next page */}
      {isFetchingNextPage && (
        <div className="space-y-0">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="p-4 rounded-lg border border-border">
              <div className="flex items-start justify-between mb-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-8 w-8" />
              </div>
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-2/3 mb-3" />
              <Skeleton className="h-9 w-full rounded-[25px]" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

