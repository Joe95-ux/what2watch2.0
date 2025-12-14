"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Eye, Tag, ArrowBigUp, ArrowBigDown, MoreVertical, Flag, PanelLeft, Edit, Trash2, ArrowLeft, Search, ArrowUpDown } from "lucide-react";
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
import { ForumSidebar } from "./forum-sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { useState } from "react";
import { useForumPostReaction, useToggleForumPostLike } from "@/hooks/use-forum-reactions";
import { ShareDropdown } from "@/components/ui/share-dropdown";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/use-current-user";
import { EditPostDialog } from "./edit-post-dialog";

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
  const isMobile = useIsMobile();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [replySort, setReplySort] = useState<"newest" | "oldest" | "top">("newest");
  const [replySearch, setReplySearch] = useState("");
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

  // Fetch related posts
  const { data: relatedPostsData } = useQuery({
    queryKey: ["forum-related-posts", post?.id, post?.category?.id],
    queryFn: async () => {
      if (!post) return { posts: [] };
      
      const params = new URLSearchParams({
        page: "1",
        limit: "10",
        sortBy: "score",
        order: "desc",
      });
      
      // Try to get posts from same category first
      if (post.category?.id) {
        params.set("categoryId", post.category.id);
      }
      
      const response = await fetch(`/api/forum/posts?${params.toString()}`);
      if (!response.ok) return { posts: [] };
      const data = await response.json();
      
      // Filter out current post and limit to 10
      const related = data.posts
        .filter((p: any) => p.id !== post.id)
        .slice(0, 10);
      
      return { posts: related };
    },
    enabled: !!post,
  });

  const relatedPosts = relatedPostsData?.posts || [];

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

  const handleReport = async () => {
    if (!isSignedIn) {
      toast.error("Sign in to report posts");
      return;
    }
    
    if (!post) return;
    
    const reason = prompt("Please provide a reason for reporting this post:");
    if (!reason || reason.trim().length === 0) {
      return;
    }

    try {
      const reportPostId = post.slug || post.id;
      const response = await fetch(`/api/forum/posts/${reportPostId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to report post");
      }

      toast.success("Post reported successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to report post");
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
      <div className="min-h-screen bg-background flex">
        <ForumSidebar 
          mobileOpen={mobileSidebarOpen}
          onMobileOpenChange={setMobileSidebarOpen}
        />
        <div className="flex-1 min-w-0">
          {isMobile && (
            <div className="sticky top-[65px] z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="px-4 py-2 flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileSidebarOpen(true)}
                  className="cursor-pointer h-9 w-9"
                >
                  <PanelLeft className="h-5 w-5" />
                </Button>
                <div className="h-4 w-px bg-border flex-shrink-0" />
                <Skeleton className="h-5 w-32" />
              </div>
            </div>
          )}
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
        </div>
      </div>
    );
  }

  if (error || !data || !post) {
    return (
      <div className="min-h-screen bg-background flex">
        <ForumSidebar 
          mobileOpen={mobileSidebarOpen}
          onMobileOpenChange={setMobileSidebarOpen}
        />
        <div className="flex-1 min-w-0">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center py-12">
              <p className="text-destructive">Failed to load post. Please try again.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <ForumSidebar 
        mobileOpen={mobileSidebarOpen}
        onMobileOpenChange={setMobileSidebarOpen}
      />

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        {/* Mobile Sidebar Trigger */}
        {isMobile && (
          <div className="sticky top-[65px] z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="px-4 py-2 flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileSidebarOpen(true)}
                className="cursor-pointer h-9 w-9"
                aria-label="Toggle sidebar"
              >
                <PanelLeft className="h-5 w-5" />
              </Button>
              <div className="h-4 w-px bg-border flex-shrink-0" />
              <h1 className="text-sm font-semibold">Forum</h1>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Two Column Layout */}
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Main Content Column */}
            <div className="flex-1 min-w-0">
              {/* Post Content */}
              <article className="mb-6 rounded-lg border border-border p-4">
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
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-1">
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
              {post.category && (
                <Link
                  href={`/forum?category=${post.category.slug}`}
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
                className="hover:underline font-medium text-foreground"
              >
                {post.author.displayName}
              </Link>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
            </div>
            
            {/* Dot Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 cursor-pointer"
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
                onClick={handleReport}
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
            <p className="whitespace-pre-wrap text-sm">{post.content}</p>
          </div>

          {/* Action Buttons - Under Tags */}
          <div className="flex items-center gap-2">
            {/* Vote Buttons - Act like one button */}
            <div className="flex items-center rounded-[25px] bg-muted/50 overflow-hidden">
              <button
                onClick={() => handleVote("upvote")}
                disabled={toggleReaction.isPending}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 transition-colors cursor-pointer",
                  isUpvoted ? "text-primary" : "hover:bg-muted",
                  toggleReaction.isPending && "opacity-50 cursor-not-allowed"
                )}
              >
                <ArrowBigUp className={cn("h-4 w-4", isUpvoted && "fill-current")} />
                {displayScore > 0 && <span className="text-sm">{displayScore}</span>}
              </button>
              <div className="h-6 w-px bg-border" />
              <button
                onClick={() => handleVote("downvote")}
                disabled={toggleReaction.isPending}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 transition-colors cursor-pointer",
                  isDownvoted ? "text-primary" : "hover:bg-muted",
                  toggleReaction.isPending && "opacity-50 cursor-not-allowed"
                )}
              >
                <ArrowBigDown className={cn("h-4 w-4", isDownvoted && "fill-current")} />
              </button>
            </div>
            
            {/* Comment Button */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <MessageCircle className="h-4 w-4" />
              {post.replyCount > 0 && <span className="text-sm font-medium">{post.replyCount}</span>}
            </div>
            
            {/* Share Button */}
            <ShareDropdown
              shareUrl={fullPostUrl}
              title={post.title}
              variant="ghost"
              size="sm"
              showLabel={false}
              className="rounded-lg bg-muted/50 hover:bg-muted h-auto px-3 py-2"
            />
            
            {/* Views */}
            <div className="flex items-center gap-1 px-3 py-2 rounded-lg bg-muted/50 text-xs text-muted-foreground ml-auto">
              <Eye className="h-4 w-4" />
              <span>{post.views}</span>
            </div>
          </div>
        </article>

        {/* Replies Section */}
        <div className="space-y-4">
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

      {/* Right Sidebar */}
      <aside className="w-full lg:w-80 flex-shrink-0">
        <div className="space-y-4 sticky top-24">
          {/* Ad Placement */}
          <div className="rounded-lg border border-border bg-muted/30 p-8 flex items-center justify-center min-h-[200px]">
            <p className="text-sm text-muted-foreground text-center">Ad Placement</p>
          </div>

          {/* Related Topics */}
          {relatedPosts.length > 0 && (
            <div className="rounded-lg border border-border bg-background">
              <div className="p-4 border-b">
                <h3 className="text-sm font-semibold">Related Topics</h3>
              </div>
              <div className="divide-y divide-border">
                {relatedPosts.map((relatedPost: any, index: number) => (
                  <Link
                    key={relatedPost.id}
                    href={relatedPost.slug ? `/forum/${relatedPost.slug}` : `/forum/${relatedPost.id}`}
                    className="block p-4 hover:bg-accent/50 transition-colors"
                  >
                    <div className="space-y-2">
                      {/* Category */}
                      {relatedPost.category && (
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded text-xs font-medium",
                              getCategoryColor(relatedPost.category.color)
                            )}
                            style={relatedPost.category.color ? {
                              backgroundColor: `${relatedPost.category.color}20`,
                              color: relatedPost.category.color,
                            } : undefined}
                          >
                            {relatedPost.category.icon && <span className="mr-1">{relatedPost.category.icon}</span>}
                            {relatedPost.category.name}
                          </span>
                        </div>
                      )}
                      
                      {/* Title */}
                      <h4 className="text-sm font-medium line-clamp-2 hover:text-primary transition-colors">
                        {relatedPost.title}
                      </h4>
                      
                      {/* Content Preview */}
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {relatedPost.content}
                      </p>
                      
                      {/* Stats */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <ArrowBigUp className="h-3 w-3" />
                          <span>{relatedPost.score > 0 ? relatedPost.score : 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          <span>{relatedPost.replyCount || 0}</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </aside>
          </div>
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
    </div>
  );
}

