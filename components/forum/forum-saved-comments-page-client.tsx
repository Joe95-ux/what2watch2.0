"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bookmark, Plus, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { RecentPosts } from "./recent-posts";
import { CreatePostDialog } from "./create-post-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { SafeHtmlContent } from "./safe-html-content";
import { useUnbookmarkReply } from "@/hooks/use-forum-reply-bookmarks";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAvatar } from "@/contexts/avatar-context";
import { BookmarkCheck } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

interface SavedReply {
  id: string;
  content: string;
  score: number;
  likes: number;
  author: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  post: {
    id: string;
    slug: string;
    title: string;
  };
  createdAt: string;
  updatedAt: string;
  bookmarkedAt: string;
}

interface SavedCommentsResponse {
  replies: SavedReply[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

function SavedCommentCard({ reply }: { reply: SavedReply }) {
  const unbookmarkReply = useUnbookmarkReply(reply.id);
  const router = useRouter();
  const { data: currentUser } = useCurrentUser();
  const { avatarUrl: contextAvatarUrl } = useAvatar();
  const isAuthor = currentUser?.id === reply.author.id;

  const handleUnsave = () => {
    unbookmarkReply.mutate();
  };

  return (
    <div className="p-4 rounded-lg border bg-card hover:border-primary/50 transition-colors">
      <div className="flex items-start gap-3">
        <Avatar className="h-8 w-8 flex-shrink-0">
          <AvatarImage src={isAuthor && contextAvatarUrl ? contextAvatarUrl : reply.author.avatarUrl} />
          <AvatarFallback className="text-xs">
            {reply.author.username?.[0] || reply.author.displayName?.[0] || "U"}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Link
              href={`/users/${reply.author.username}`}
              className="font-medium text-sm hover:underline"
            >
              {reply.author.username || reply.author.displayName}
            </Link>
            <span className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
            </span>
          </div>

          <div className="text-sm text-muted-foreground mb-2">
            <Link
              href={`/forum/${reply.post.slug || reply.post.id}`}
              className="hover:text-foreground hover:underline"
            >
              on {reply.post.title}
            </Link>
          </div>

          <div className="prose prose-sm dark:prose-invert max-w-none mb-3">
            <SafeHtmlContent content={reply.content} />
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{reply.score} {reply.score === 1 ? "vote" : "votes"}</span>
            <Link
              href={`/forum/${reply.post.slug || reply.post.id}#reply-${reply.id}`}
              className="hover:text-foreground"
            >
              View in context
            </Link>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleUnsave();
              }}
              className="cursor-pointer"
              disabled={unbookmarkReply.isPending}
            >
              <BookmarkCheck className="h-4 w-4 mr-2" />
              Unsave Comment
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function ForumSavedCommentsPageClient() {
  const { isSignedIn } = useUser();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data, isLoading, error } = useQuery<SavedCommentsResponse>({
    queryKey: ["forum-reply-bookmarks", page],
    queryFn: async () => {
      const response = await fetch(`/api/forum/replies/bookmarks?page=${page}&limit=20`);
      if (!response.ok) {
        throw new Error("Failed to fetch saved comments");
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
          <h2 className="text-xl font-semibold mb-2">Sign in to view saved comments</h2>
          <p className="text-muted-foreground mb-4">
            Sign in to save and view your saved comments
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
          <p className="text-destructive">Failed to load saved comments. Please try again.</p>
        </div>
      </div>
    );
  }

  const replies = data?.replies || [];
  const pagination = data?.pagination;

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Two Column Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content Column */}
          <div className="flex-1 min-w-0">
            {/* Header with Create Post Button */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold">Saved Comments</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {pagination ? `${pagination.total} saved ${pagination.total === 1 ? "comment" : "comments"}` : "Your saved comments"}
                </p>
              </div>
              {isSignedIn && (
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="cursor-pointer"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Post
                </Button>
              )}
            </div>

            {/* Comments List */}
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : replies.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">No saved comments yet</h2>
                <p className="text-muted-foreground mb-4">
                  Start saving comments to view them later
                </p>
                <Button onClick={() => router.push("/forum")}>
                  Browse Forum
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {replies.map((reply) => (
                    <SavedCommentCard key={reply.id} reply={reply} />
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

          {/* Right Sidebar - Sticky */}
          <aside className="w-full lg:w-80 flex-shrink-0 lg:sticky lg:top-[85px] self-start">
            <div className="space-y-4">
              {/* Recent Posts */}
              <RecentPosts limit={5} />
            </div>
          </aside>
        </div>
      </div>

      {/* Create Post Dialog */}
      {isSignedIn && (
        <CreatePostDialog
          isOpen={isCreateDialogOpen}
          onClose={() => setIsCreateDialogOpen(false)}
        />
      )}
    </>
  );
}

