"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ForumPostCard } from "./forum-post-card";
import { useUser } from "@clerk/nextjs";
import { useUnbookmarkPost } from "@/hooks/use-forum-bookmarks";
import { useRouter } from "next/navigation";

interface BookmarkedPost {
  id: string;
  slug: string;
  title: string;
  content: string;
  tags: string[];
  metadata?: Record<string, any> | null;
  tmdbId?: number;
  mediaType?: string;
  views: number;
  score: number;
  replyCount: number;
  category?: {
    id: string;
    name: string;
    slug: string;
    color?: string;
    icon?: string | null;
  } | null;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  createdAt: string;
  updatedAt: string;
  bookmarkedAt: string;
}

interface BookmarksResponse {
  posts: BookmarkedPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function ForumBookmarksPageClient() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery<BookmarksResponse>({
    queryKey: ["forum-bookmarks", page],
    queryFn: async () => {
      const response = await fetch(`/api/forum/bookmarks?page=${page}&limit=20`);
      if (!response.ok) {
        throw new Error("Failed to fetch bookmarks");
      }
      return response.json();
    },
    enabled: isSignedIn,
  });

  if (!isSignedIn) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center py-12">
          <Bookmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Sign in to view bookmarks</h2>
          <p className="text-muted-foreground mb-4">
            Sign in to save and view your bookmarked posts
          </p>
          <Button onClick={() => router.push("/sign-in")}>
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center py-12">
          <p className="text-destructive">Failed to load bookmarks. Please try again.</p>
        </div>
      </div>
    );
  }

  const posts = data?.posts || [];
  const pagination = data?.pagination;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <BookmarkCheck className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Bookmarked Posts</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {pagination ? `${pagination.total} bookmarked ${pagination.total === 1 ? "post" : "posts"}` : "Your saved posts"}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-12">
          <Bookmark className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No bookmarks yet</h2>
          <p className="text-muted-foreground mb-4">
            Start bookmarking posts to save them for later
          </p>
          <Button onClick={() => router.push("/forum")}>
            Browse Forum
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {posts.map((post) => (
              <ForumPostCard key={post.id} post={post} />
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

