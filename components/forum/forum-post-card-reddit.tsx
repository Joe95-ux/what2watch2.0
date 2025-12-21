"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Eye, Hash, MoreVertical, Flag, Edit, Trash2, Bookmark, BookmarkCheck, History as HistoryIcon } from "lucide-react";
import { BiSolidUpvote, BiSolidDownvote } from "react-icons/bi";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useForumPostReaction, useToggleForumPostLike } from "@/hooks/use-forum-reactions";
import { usePostBookmark, useBookmarkPost, useUnbookmarkPost } from "@/hooks/use-forum-bookmarks";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ShareDropdown } from "@/components/ui/share-dropdown";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { EditPostDialog } from "./edit-post-dialog";
import { PostHistoryDialog } from "./post-history-dialog";
import { ReportDialog } from "./report-dialog";
import { SafeHtmlContent } from "./safe-html-content";
import { extractAllLinks } from "@/lib/forum-link-extractor";
import { LinkSelectorModal } from "./link-selector-modal";
import { Link as LinkIcon } from "lucide-react";

interface ForumPost {
  id: string;
  slug?: string;
  title: string;
  content: string;
  tags: string[];
  tmdbId?: number;
  mediaType?: string;
  metadata?: Record<string, any> | null;
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
  createdAt: string;
  updatedAt: string;
}

interface ForumPostCardProps {
  post: ForumPost;
}

export function ForumPostCardReddit({ post }: ForumPostCardProps) {
  const { isSignedIn } = useUser();
  const { data: currentUser } = useCurrentUser();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);

  // Extract links from post content and metadata
  const extractedLinks = useMemo(() => {
    return extractAllLinks(post.content, post.metadata as Record<string, any> | null);
  }, [post.content, post.metadata]);

  const handleLinkClick = () => {
    if (extractedLinks.length === 0) return;
    
    if (extractedLinks.length === 1) {
      // Single link - open directly
      window.open(extractedLinks[0].url, "_blank", "noopener,noreferrer");
    } else {
      // Multiple links - show modal
      setIsLinkModalOpen(true);
    }
  };
  
  const isAuthor = currentUser?.id === post.author.id;
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const { data: reaction } = useForumPostReaction(post.id);
  const toggleReaction = useToggleForumPostLike(post.id);

  const userReaction = reaction?.reactionType || null;
  const isUpvoted = userReaction === "upvote";
  const isDownvoted = userReaction === "downvote";
  const displayScore = reaction?.score ?? post.score;

  // Bookmark functionality
  const { data: bookmarkData } = usePostBookmark(post.id);
  const isBookmarked = bookmarkData?.bookmarked || false;
  const bookmarkPost = useBookmarkPost(post.id);
  const unbookmarkPost = useUnbookmarkPost(post.id);

  const handleBookmarkToggle = async () => {
    if (!isSignedIn) {
      toast.error("Sign in to bookmark posts");
      return;
    }

    if (isBookmarked) {
      unbookmarkPost.mutate();
    } else {
      bookmarkPost.mutate();
    }
  };

  const handleVote = async (type: "upvote" | "downvote") => {
    if (!isSignedIn) {
      toast.error("Sign in to vote on posts");
      return;
    }
    if (!toggleReaction.mutate) return;
    
    if (userReaction === type) {
      toggleReaction.mutate({ type: null });
    } else {
      toggleReaction.mutate({ type });
    }
  };

  const handleReport = async (reason: string, description?: string) => {
    setIsReporting(true);
    try {
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

  const postUrl = post.slug ? `/forum/${post.slug}` : `/forum/${post.id}`;
  const fullPostUrl = typeof window !== "undefined" ? `${window.location.origin}${postUrl}` : postUrl;

  const getCategoryColor = (color?: string | null) => {
    if (!color) return "bg-blue-500/20 text-blue-700 dark:text-blue-400";
    
    // Vibrant color mapping
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

  return (
    <div className="p-4 bg-muted/50 dark:bg-muted/30 hover:bg-muted/70 dark:hover:bg-muted/50 transition-colors rounded-lg">
      {/* Post Header with Dot Menu */}
      <div className="flex items-start justify-between mb-2 gap-2">
        <div className="flex-1 min-w-0">
          {/* Category - Always on top */}
          {post.category && (
            <div className="mb-1.5">
              <Link
                href={`/forum?category=${post.category.slug}`}
                onClick={(e) => e.stopPropagation()}
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
            <Avatar className="h-9 w-9">
              <AvatarImage src={post.author.avatarUrl} alt={post.author.username || post.author.displayName} />
              <AvatarFallback className="text-xs">
                {getInitials(post.author.username || post.author.displayName)}
              </AvatarFallback>
            </Avatar>
            <Link
              href={`/users/${post.author.username || post.author.id}`}
              onClick={(e) => e.stopPropagation()}
              className="hover:underline font-medium text-foreground"
            >
              {post.author.username || post.author.displayName}
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
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {isAuthor && (
              <>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsEditDialogOpen(true);
                  }}
                  className="cursor-pointer"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Post
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsHistoryDialogOpen(true);
                  }}
                  className="cursor-pointer"
                >
                  <HistoryIcon className="h-4 w-4 mr-2" />
                  View History
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }}
                  className="cursor-pointer text-destructive"
                  disabled={deletePost.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Post
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            {isSignedIn && (
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  handleBookmarkToggle();
                }}
                className="cursor-pointer"
                disabled={bookmarkPost.isPending || unbookmarkPost.isPending}
              >
                {isBookmarked ? (
                  <>
                    <BookmarkCheck className="h-4 w-4 mr-2" />
                    Remove from Bookmarks
                  </>
                ) : (
                  <>
                    <Bookmark className="h-4 w-4 mr-2" />
                    Add to Bookmarks
                  </>
                )}
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                setIsReportDialogOpen(true);
              }}
              className="cursor-pointer"
            >
              <Flag className="h-4 w-4 mr-2" />
              Report Post
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Post Title */}
      <Link href={postUrl} className="block mb-2">
        <h3 className="text-[1.1rem] font-semibold hover:text-primary transition-colors line-clamp-2">
          {post.title}
        </h3>
      </Link>

      {/* Post Content Preview */}
      <Link href={postUrl} className="block mb-3">
        <div className="text-[0.9rem] text-muted-foreground line-clamp-3">
          <SafeHtmlContent 
            content={post.content}
            className="[&_p]:mb-2 [&_p:last-child]:mb-0 [&_img]:max-w-full [&_img]:h-auto [&_img]:rounded-lg [&_img]:my-1"
          />
        </div>
      </Link>

      {/* Tags and Links */}
      {(post.tags.length > 0 || extractedLinks.length > 0) && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {post.tags.slice(0, 3).map((tag) => (
            <Link
              key={tag}
              href={`/forum?tag=${encodeURIComponent(tag)}`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted hover:bg-muted/80 text-xs rounded-full transition-colors"
            >
              <Hash className="h-3 w-3" />
              {tag}
            </Link>
          ))}
          {post.tags.length > 3 && (
            <span className="text-xs text-muted-foreground">+{post.tags.length - 3} more</span>
          )}
          {extractedLinks.length > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleLinkClick();
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-muted hover:bg-muted/80 text-xs rounded-full transition-colors cursor-pointer"
            >
              <LinkIcon className="h-3 w-3" />
              {extractedLinks.length} {extractedLinks.length === 1 ? "link" : "links"}
            </button>
          )}
        </div>
      )}

      {/* Action Buttons - Under Tags */}
      <div className="flex items-center gap-2">
        {/* Vote Buttons - Reddit style: upvote | count | downvote */}
        <div className={cn(
          "flex items-center rounded-[25px] overflow-hidden transition-colors",
          isUpvoted && "bg-orange-500/10",
          isDownvoted && "bg-blue-500/10",
          !isUpvoted && !isDownvoted && "bg-[#6B7280]/20 dark:bg-muted/80"
        )}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleVote("upvote");
            }}
            disabled={toggleReaction.isPending}
            className={cn(
              "flex items-center justify-center px-2 py-2 transition-colors cursor-pointer",
              "hover:bg-[#6B7280]/30 dark:hover:bg-muted",
              isUpvoted && "text-orange-500 hover:bg-orange-500/20",
              toggleReaction.isPending && "opacity-50 cursor-not-allowed"
            )}
          >
            <BiSolidUpvote className={cn(
              "h-4 w-4 [stroke-width:2px]",
              isUpvoted 
                ? "stroke-orange-500 dark:stroke-orange-500 fill-orange-500 dark:fill-orange-500" 
                : "stroke-current fill-transparent dark:fill-transparent"
            )} />
          </button>
          <span className={cn(
            "text-sm font-medium min-w-[2rem] text-center px-1",
            isUpvoted && "text-orange-500",
            isDownvoted && "text-blue-500"
          )}>
            {displayScore === 0 ? "Vote" : displayScore}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleVote("downvote");
            }}
            disabled={toggleReaction.isPending}
            className={cn(
              "flex items-center justify-center px-2 py-2 transition-colors cursor-pointer",
              "hover:bg-[#6B7280]/30 dark:hover:bg-muted",
              isDownvoted && "text-blue-500 hover:bg-blue-500/20",
              toggleReaction.isPending && "opacity-50 cursor-not-allowed"
            )}
          >
            <BiSolidDownvote className={cn(
              "h-4 w-4 [stroke-width:2px]",
              isDownvoted 
                ? "stroke-blue-500 dark:stroke-blue-500 fill-blue-500 dark:fill-blue-500" 
                : "stroke-current fill-transparent dark:fill-transparent"
            )} />
          </button>
        </div>
        
        {/* Comment Button */}
        <Link
          href={postUrl}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2 px-3 py-2 rounded-[25px] bg-[#6B7280]/20 dark:bg-muted/80 hover:bg-[#6B7280]/30 dark:hover:bg-muted transition-colors cursor-pointer"
        >
          <MessageCircle className="h-4 w-4" />
          <span className="text-sm font-medium">{post.replyCount || 0}</span>
        </Link>
        
        {/* Share Button */}
        <div onClick={(e) => e.stopPropagation()}>
          <ShareDropdown
            shareUrl={fullPostUrl}
            title={post.title}
            variant="ghost"
            size="sm"
            showLabel={true}
            className="rounded-[25px] bg-[#6B7280]/20 dark:bg-muted/80 hover:bg-[#6B7280]/30 dark:hover:bg-muted h-auto px-3 py-2"
          />
        </div>
        
        {/* Views */}
        <div className="hidden md:flex items-center gap-1 px-3 py-2 rounded-[25px] bg-[#6B7280]/20 dark:bg-muted/80 text-xs text-muted-foreground ml-auto">
          <Eye className="h-4 w-4" />
          <span>{post.views}</span>
        </div>
      </div>

      {/* Edit Post Dialog */}
      {isEditDialogOpen && (
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

      {/* Link Selector Modal */}
      <LinkSelectorModal
        links={extractedLinks}
        open={isLinkModalOpen}
        onOpenChange={setIsLinkModalOpen}
      />
      
      {/* Post History Dialog */}
      <PostHistoryDialog
        postId={post.id}
        isOpen={isHistoryDialogOpen}
        onClose={() => setIsHistoryDialogOpen(false)}
        postAuthorId={post.author.id}
      />
    </div>
  );
}

