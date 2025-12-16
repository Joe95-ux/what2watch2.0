"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Eye, Tag, MoreVertical, Flag, Edit, Trash2, ArrowLeft, Search, ArrowUpDown } from "lucide-react";
import { BiSolidUpvote, BiSolidDownvote } from "react-icons/bi";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ForumReplyList } from "./forum-reply-list";
import { CreateReplyForm } from "./create-reply-form";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useForumPostReaction, useToggleForumPostLike } from "@/hooks/use-forum-reactions";
import { ShareDropdown } from "@/components/ui/share-dropdown";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/use-current-user";
import { EditPostDialog } from "./edit-post-dialog";
import { ReportDialog } from "./report-dialog";
import { SafeHtmlContent } from "./safe-html-content";
import { PostMetadataDisplay } from "./post-metadata-display";
import { RecentPosts } from "./recent-posts";
import { X } from "lucide-react";

interface ForumPost {
  id: string;
  slug?: string;
  title: string;
  content: string;
  tags: string[];
  metadata?: Record<string, any> | null;
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
  score?: number;
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
  const { data: currentUser } = useCurrentUser();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [replySort, setReplySort] = useState<"newest" | "oldest" | "top">("newest");
  const [replySearch, setReplySearch] = useState("");
  const [adsClosed, setAdsClosed] = useState(false);
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


  // Filter and sort replies
  const filterReplies = (replies: ForumReply[], search: string): ForumReply[] => {
    if (!search.trim()) return replies;
    const searchLower = search.toLowerCase();
    return replies.filter(reply => 
      reply.content.toLowerCase().includes(searchLower) ||
      reply.author.displayName.toLowerCase().includes(searchLower)
    ).map(reply => ({
      ...reply,
      replies: filterReplies(reply.replies || [], search)
    }));
  };

  const sortReplies = (replies: ForumReply[], sortBy: "newest" | "oldest" | "top"): ForumReply[] => {
    const sorted = [...replies].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case "oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "top":
          const aScore = (a as ForumReply & { score?: number }).score ?? a.likes ?? 0;
          const bScore = (b as ForumReply & { score?: number }).score ?? b.likes ?? 0;
          return bScore - aScore;
        default:
          return 0;
      }
    });
    return sorted.map(reply => ({
      ...reply,
      replies: sortReplies(reply.replies || [], sortBy)
    }));
  };

  const filteredAndSortedReplies = post?.replies 
    ? sortReplies(filterReplies(post.replies, replySearch), replySort)
    : [];

  const userReaction = reaction?.reactionType || null;
  const isUpvoted = userReaction === "upvote";
  const isDownvoted = userReaction === "downvote";
  const displayScore = reaction?.score ?? post?.score ?? 0;

  const handleVote = async (type: "upvote" | "downvote") => {
    if (!isSignedIn) {
      toast.error("Sign in to vote on posts");
      return;
    }
    if (!toggleReaction.mutate || !post) return;
    
    if (userReaction === type) {
      toggleReaction.mutate({ type: null });
    } else {
      toggleReaction.mutate({ type });
    }
  };

  const isAuthor = currentUser?.id === post?.author.id;

  const handleReport = async (reason: string, description?: string) => {
    setIsReporting(true);
    try {
      if (!post) return;
      const reportPostId = post.slug || post.id;
      const response = await fetch(`/api/forum/posts/${reportPostId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason, description }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to report post");
      }

      toast.success("Post reported successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to report post");
    } finally {
      setIsReporting(false);
    }
  };

  const deletePost = useMutation({
    mutationFn: async () => {
      if (!post) throw new Error("Post not found");
      const postId = post.slug || post.id;
      const response = await fetch(`/api/forum/posts/${postId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete post");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-posts"] });
      toast.success("Post deleted successfully");
      router.push("/forum");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to delete post");
    },
  });

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
      return;
    }
    deletePost.mutate();
  };

  const postUrl = post?.slug ? `/forum/${post.slug}` : `/forum/${post?.id}`;
  const fullPostUrl = typeof window !== "undefined" ? `${window.location.origin}${postUrl}` : postUrl;

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          {/* Post skeleton */}
          <div className="rounded-lg border border-border p-4 space-y-3">
            <div className="flex items-start justify-between">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-8 w-8" />
            </div>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-9 w-full rounded-[25px]" />
          </div>
          {/* Replies section header */}
          <Skeleton className="h-6 w-32" />
          {/* Reply form skeleton */}
          <Skeleton className="h-24 w-full" />
          {/* Replies skeleton */}
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-2">
                <div className="flex flex-col items-center gap-1 pt-1">
                  <Skeleton className="h-6 w-6" />
                  <Skeleton className="h-4 w-6" />
                  <Skeleton className="h-6 w-6" />
                </div>
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data || !post) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center py-12">
          <p className="text-destructive">Failed to load post. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Two Column Layout */}
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Main Content Column */}
          <div className="flex-1 min-w-0">
            {/* Post Content */}
            <article className="rounded-lg">
              {/* Back Button */}
              <div className="mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="gap-2"
            >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
              </div>
              
              {/* Header with Dot Menu */}
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="flex-1 min-w-0">
                  {/* Category - Always on top */}
                  {post.category && (
                    <div className="mb-1.5">
                      <Link
                        href={`/forum?category=${post.category.slug}`}
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium transition-colors",
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
                    </div>
                  )}
                  
                  {/* Author and Time - Below category on mobile, inline on desktop */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={post.author.avatarUrl} />
                      <AvatarFallback className="text-xs">
                        {post.author.displayName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <Link
                      href={`/users/${post.author.username || post.author.id}`}
                      className="hover:underline font-medium text-foreground"
                    >
                      {post.author.displayName}
                    </Link>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                  </div>
                </div>
                
                {/* Dot Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 cursor-pointer flex-shrink-0"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {isAuthor && (
                      <>
                        <DropdownMenuItem
                          onClick={() => setIsEditDialogOpen(true)}
                          className="cursor-pointer"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Post
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={handleDelete}
                          className="cursor-pointer text-destructive"
                          disabled={deletePost.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Post
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}
                    <DropdownMenuItem
                      onClick={() => setIsReportDialogOpen(true)}
                      className="cursor-pointer"
                    >
                      <Flag className="h-4 w-4 mr-2" />
                      Report Post
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
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
                <SafeHtmlContent 
                  content={post.content}
                  className="text-base [&_p]:mb-3 [&_p:last-child]:mb-0 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-2"
                />
              </div>

              {/* Category Metadata */}
              {post.metadata && (
                <div className="mb-4">
                  <PostMetadataDisplay 
                    metadata={post.metadata} 
                    categorySlug={post.category?.slug}
                  />
                </div>
              )}

              {/* Action Buttons - Under Tags */}
              <div className="flex items-center gap-2">
                {/* Vote Buttons - Act like one button */}
                <div className="flex items-center rounded-[25px] bg-muted dark:bg-muted/80 overflow-hidden">
                  <button
                    onClick={() => handleVote("upvote")}
                    disabled={toggleReaction.isPending}
                    className={cn(
                      "flex items-center gap-1 px-4 py-2 transition-colors cursor-pointer",
                      isUpvoted ? "text-primary" : "hover:bg-muted",
                      toggleReaction.isPending && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <BiSolidUpvote className={cn("h-4 w-4 [stroke-width:2px] stroke-current", isUpvoted ? "fill-white" : "fill-transparent")} />
                    {displayScore > 0 && <span className="text-sm">{displayScore}</span>}
                  </button>
                  <div className="h-6 w-px bg-border" />
                  <button
                    onClick={() => handleVote("downvote")}
                    disabled={toggleReaction.isPending}
                    className={cn(
                      "flex items-center gap-1 px-4 py-2 transition-colors cursor-pointer",
                      isDownvoted ? "text-primary" : "hover:bg-muted",
                      toggleReaction.isPending && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <BiSolidDownvote className={cn("h-4 w-4 [stroke-width:2px] stroke-current", isDownvoted ? "fill-white" : "fill-transparent")} />
                  </button>
                </div>
                
                {/* Comment Button */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-[25px] bg-muted dark:bg-muted/80 text-xs text-muted-foreground">
                  <MessageCircle className="h-4 w-4" />
                  {post.replyCount > 0 && <span className="text-sm font-medium">{post.replyCount}</span>}
                </div>
                
                {/* Share Button */}
                <ShareDropdown
                  shareUrl={fullPostUrl}
                  title={post.title}
                  variant="ghost"
                  size="sm"
                  showLabel={true}
                  className="rounded-[25px] bg-muted dark:bg-muted/80 hover:bg-muted/90 dark:hover:bg-muted h-auto px-3 py-2"
                />
                
                {/* Views */}
                <div className="flex items-center gap-1 px-3 py-2 rounded-[25px] bg-muted dark:bg-muted/80 text-xs text-muted-foreground ml-auto">
                  <Eye className="h-4 w-4" />
                  <span>{post.views}</span>
                </div>
              </div>
            </article>

            {/* Replies Section */}
            <div className="mt-8 space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-lg font-semibold">
              {post.replyCount} {post.replyCount === 1 ? "Comment" : "Comments"}
            </h2>
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search comments..."
                  value={replySearch}
                  onChange={(e) => setReplySearch(e.target.value)}
                  className="pl-8 h-9 w-48"
                />
              </div>
              
              {/* Sort */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-2">
                    <ArrowUpDown className="h-4 w-4" />
                    Sort
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setReplySort("newest")}
                    className={cn("cursor-pointer", replySort === "newest" && "bg-accent")}
                  >
                    Newest First
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setReplySort("oldest")}
                    className={cn("cursor-pointer", replySort === "oldest" && "bg-accent")}
                  >
                    Oldest First
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setReplySort("top")}
                    className={cn("cursor-pointer", replySort === "top" && "bg-accent")}
                  >
                    Top Rated
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Create Reply Form */}
          {isSignedIn && (
            <div className="mb-4">
              <CreateReplyForm postId={postId} />
            </div>
          )}

          {/* Replies List */}
              <ForumReplyList 
                replies={filteredAndSortedReplies} 
                postId={postId} 
              />
            </div>
          </div>

          {/* Right Sidebar - Sticky */}
          <aside className="w-full lg:w-80 flex-shrink-0 lg:sticky lg:top-[85px] self-start">
            <div className="space-y-4">
              {/* Ad Placement - Closable */}
              {!adsClosed && (
                <div className="rounded-lg border border-border bg-muted/30 p-8 flex items-center justify-center min-h-[200px] relative">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 h-6 w-6 cursor-pointer"
                    onClick={() => setAdsClosed(true)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  <p className="text-sm text-muted-foreground text-center">Ad Placement</p>
                </div>
              )}

              {/* Recent Posts */}
              <RecentPosts excludePostId={post.id} limit={5} />
            </div>
          </aside>
        </div>
      </div>

      {/* Edit Post Dialog */}
      {isEditDialogOpen && post && (
        <EditPostDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          post={post}
        />
      )}

      {/* Report Dialog */}
      <ReportDialog
        isOpen={isReportDialogOpen}
        onClose={() => setIsReportDialogOpen(false)}
        onSubmit={handleReport}
        type="post"
        isPending={isReporting}
      />
    </>
  );
}

