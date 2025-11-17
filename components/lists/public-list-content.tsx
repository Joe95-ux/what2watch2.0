"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Share2, Edit2, MoreVertical } from "lucide-react";
import MovieCard from "@/components/browse/movie-card";
import ContentDetailModal from "@/components/browse/content-detail-modal";
import type { List } from "@/hooks/use-lists";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useDeleteList } from "@/hooks/use-lists";
import { useIsListLiked, useLikeList, useUnlikeList } from "@/hooks/use-list-likes";
import { useListComments, useCreateListComment, useDeleteListComment, useUpdateListComment, type ListComment } from "@/hooks/use-list-comments";
import { Ban, UserX } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { toast } from "sonner";
import { FollowButton } from "@/components/social/follow-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import CreateListModal from "./create-list-modal";
import { Heart, MessageSquare, Send, Edit2 as Edit, Trash2, Reply, Smile } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useMemo, useRef } from "react";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { cn } from "@/lib/utils";
import { useAddListCommentReaction, useRemoveListCommentReaction } from "@/hooks/use-list-comments";

interface PublicListContentProps {
  listId: string;
}

export default function PublicListContent({ listId }: PublicListContentProps) {
  const router = useRouter();
  const { data: currentUser } = useCurrentUser();
  const deleteList = useDeleteList();
  const [selectedItem, setSelectedItem] = useState<{ item: TMDBMovie | TMDBSeries; type: "movie" | "tv" } | null>(null);
  const [list, setList] = useState<List | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [commentFilter, setCommentFilter] = useState("newest");
  const [newComment, setNewComment] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  
  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "movie" | "tv">("all");
  const [sortBy, setSortBy] = useState<"position" | "title" | "year">("position");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const isOwner = Boolean(currentUserId && list && currentUserId === list.userId);

  // Like functionality
  const { data: likeStatus } = useIsListLiked(list?.id || null);
  const likeMutation = useLikeList();
  const unlikeMutation = useUnlikeList();
  const isLiked = likeStatus?.isLiked ?? false;
  const canLike = !isOwner && list && (list.visibility === "PUBLIC" || list.visibility === "FOLLOWERS_ONLY");

  // Comments functionality
  const { data: comments = [], isLoading: commentsLoading } = useListComments(list?.id || "", commentFilter);
  const createComment = useCreateListComment();
  const updateComment = useUpdateListComment();
  const deleteComment = useDeleteListComment();

  // Block/unblock user
  const handleBlockUser = async (userId: string) => {
    if (!list) return;
    try {
      const res = await fetch(`/api/lists/${list.id}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIdToBlock: userId }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to block user");
      }
      toast.success("User blocked from commenting");
      // Refresh list to get updated blockedUsers
      window.location.reload();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to block user";
      toast.error(errorMessage);
    }
  };

  const handleUnblockUser = async (userId: string) => {
    if (!list) return;
    try {
      const res = await fetch(`/api/lists/${list.id}/block?userId=${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to unblock user");
      }
      toast.success("User unblocked");
      // Refresh list to get updated blockedUsers
      window.location.reload();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to unblock user";
      toast.error(errorMessage);
    }
  };

  useEffect(() => {
    const fetchList = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/lists/${listId}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to load list");
          return;
        }
        const data = await res.json();
        setList(data.list);
        // Get current user ID from API response
        setCurrentUserId(data.currentUserId || null);
      } catch (err) {
        setError("Failed to load list");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchList();
  }, [listId]);

  // Redirect owner to dashboard list page for better UX
  useEffect(() => {
    if (isOwner && list && !isLoading) {
      router.replace(`/dashboard/lists/${list.id}`);
    }
  }, [isOwner, list, isLoading, router]);

  const handleDelete = async () => {
    if (!list) return;
    try {
      await deleteList.mutateAsync(list.id);
      toast.success("List deleted");
      router.push("/dashboard/lists");
    } catch {
      toast.error("Failed to delete list");
    }
  };

  const handleShare = () => {
    if (navigator.share && list) {
      navigator.share({
        title: list.name,
        text: list.description || `Check out ${list.name} on What2Watch`,
        url: window.location.href,
      }).catch(() => {
        // Fallback to clipboard
        navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied to clipboard");
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    }
  };

  const handleLike = () => {
    if (!list) return;
    if (isLiked) {
      unlikeMutation.mutate(list.id, {
        onSuccess: () => toast.success("Removed from your library"),
        onError: () => toast.error("Failed to remove list"),
      });
    } else {
      likeMutation.mutate(list.id, {
        onSuccess: () => toast.success("Added to your library"),
        onError: () => toast.error("Failed to add list"),
      });
    }
  };

  const handlePostComment = async () => {
    if (!list || !newComment.trim()) return;
    try {
      await createComment.mutateAsync({
        listId: list.id,
        content: newComment.trim(),
      });
      setNewComment("");
      toast.success("Comment posted");
    } catch {
      toast.error("Failed to post comment");
    }
  };

  const handlePostReply = async (parentCommentId: string) => {
    if (!list || !replyContent.trim()) return;
    try {
      await createComment.mutateAsync({
        listId: list.id,
        content: replyContent.trim(),
        parentCommentId,
      });
      setReplyContent("");
      setReplyingTo(null);
      toast.success("Reply posted");
    } catch {
      toast.error("Failed to post reply");
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!list || !editingContent.trim()) return;
    try {
      await updateComment.mutateAsync({
        listId: list.id,
        commentId,
        content: editingContent.trim(),
      });
      setEditingCommentId(null);
      setEditingContent("");
      toast.success("Comment updated");
    } catch {
      toast.error("Failed to update comment");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!list) return;
    try {
      await deleteComment.mutateAsync({ listId: list.id, commentId });
      toast.success("Comment deleted");
    } catch {
      toast.error("Failed to delete comment");
    }
  };

  // Convert list items to TMDB format for MovieCard with original position
  const itemsWithPosition = useMemo(() => {
    if (!list) return [];
    return (list.items || []).map((item, index) => {
      const baseItem = {
        originalIndex: index,
        position: item.position,
      };
      
      if (item.mediaType === "movie") {
        return {
          ...baseItem,
          id: item.tmdbId,
          title: item.title,
          overview: "",
          poster_path: item.posterPath,
          backdrop_path: item.backdropPath,
          release_date: item.releaseDate || "",
          vote_average: 0,
          vote_count: 0,
          genre_ids: [],
          popularity: 0,
          adult: false,
          original_language: "en",
          original_title: item.title,
          mediaType: "movie" as const,
        } as TMDBMovie & { originalIndex: number; position: number; mediaType: "movie" };
      } else {
        return {
          ...baseItem,
          id: item.tmdbId,
          name: item.title,
          overview: "",
          poster_path: item.posterPath,
          backdrop_path: item.backdropPath,
          first_air_date: item.firstAirDate || "",
          vote_average: 0,
          vote_count: 0,
          genre_ids: [],
          popularity: 0,
          original_language: "en",
          original_name: item.title,
          mediaType: "tv" as const,
        } as TMDBSeries & { originalIndex: number; position: number; mediaType: "tv" };
      }
    });
  }, [list]);

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = [...itemsWithPosition];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((item) => {
        const title = "title" in item ? item.title : item.name;
        return title?.toLowerCase().includes(query);
      });
    }

    // Type filter
    if (filterType !== "all") {
      filtered = filtered.filter((item) => item.mediaType === filterType);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: string | number;
      let bValue: string | number;

      switch (sortBy) {
        case "position":
          aValue = a.position;
          bValue = b.position;
          break;
        case "title":
          aValue = ("title" in a ? a.title : a.name || "").toLowerCase();
          bValue = ("title" in b ? b.title : b.name || "").toLowerCase();
          break;
        case "year":
          const aDate = "release_date" in a ? a.release_date : a.first_air_date;
          const bDate = "release_date" in b ? b.release_date : b.first_air_date;
          aValue = aDate ? new Date(aDate).getFullYear() : 0;
          bValue = bDate ? new Date(bDate).getFullYear() : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === "asc" ? -1 : 1;
      if (aValue > bValue) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [itemsWithPosition, searchQuery, filterType, sortBy, sortOrder]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchQuery.trim()) count++;
    if (filterType !== "all") count++;
    if (sortBy !== "position" || sortOrder !== "asc") count++;
    return count;
  }, [searchQuery, filterType, sortBy, sortOrder]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !list) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">List not found</h1>
          <p className="text-muted-foreground">{error || "This list doesn't exist or is private."}</p>
          <Button onClick={() => router.back()} className="cursor-pointer">Go Back</Button>
        </div>
      </div>
    );
  }

  const user = list.user;
  const displayName = user?.displayName || user?.username || "Unknown";
  const username = user?.username || "unknown";

  return (
    <>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                    className="flex-shrink-0 cursor-pointer"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-3xl font-bold truncate">{list.name}</h1>
                    {list.description && (
                      <p className="text-muted-foreground mt-2">{list.description}</p>
                    )}
                  </div>
                </div>

                {/* User Info */}
                <div className="flex items-center gap-3">
                  <Link href={`/users/${user?.id}`}>
                    <Avatar className="h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity">
                      <AvatarImage src={user?.avatarUrl || undefined} />
                      <AvatarFallback>
                        {displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/users/${user?.id}`}>
                      <p className="font-medium hover:underline cursor-pointer">{displayName}</p>
                    </Link>
                    {username && (
                      <p className="text-sm text-muted-foreground">@{username}</p>
                    )}
                  </div>
                  {!isOwner && user?.id && (
                    <FollowButton userId={user.id} />
                  )}
                </div>

                {/* Meta Info */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{list.items?.length || 0} films</span>
                  {list.tags && list.tags.length > 0 && (
                    <div className="flex items-center gap-2">
                      {list.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {list.tags.length > 3 && (
                        <span className="text-xs">+{list.tags.length - 3} more</span>
                      )}
                    </div>
                  )}
                  <span>Updated {format(new Date(list.updatedAt), "MMM d, yyyy")}</span>
                  <Badge variant="outline" className="text-xs">
                    {list.visibility === "PUBLIC" ? "Public" : list.visibility === "FOLLOWERS_ONLY" ? "Followers Only" : "Private"}
                  </Badge>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                {/* Like Button - Only for PUBLIC or FOLLOWERS_ONLY lists */}
                {canLike && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleLike}
                    className="cursor-pointer"
                  >
                    <Heart
                      className={`h-5 w-5 ${isLiked ? "fill-red-500 text-red-500" : ""}`}
                    />
                  </Button>
                )}
                {isOwner && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="cursor-pointer">
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={handleShare} className="cursor-pointer">
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setIsEditModalOpen(true)} className="cursor-pointer">
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setIsDeleteDialogOpen(true)}
                        className="text-destructive cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {!isOwner && (
                  <Button variant="outline" size="icon" onClick={handleShare} className="cursor-pointer">
                    <Share2 className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* List Items */}
        <div className="container mx-auto px-4 py-8">
          {itemsWithPosition.length > 0 ? (
            <>
              {/* Filters and Sort */}
              <div className="mb-6 flex flex-wrap items-center gap-3">
                {/* Search */}
                <div className="relative w-72 lg:w-80 2xl:w-96">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search list..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Media Type Filter */}
                <Select value={filterType} onValueChange={(v) => setFilterType(v as "all" | "movie" | "tv")}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="movie">Movies</SelectItem>
                    <SelectItem value="tv">TV Shows</SelectItem>
                  </SelectContent>
                </Select>

                {/* Sort */}
                <Select
                  value={`${sortBy}-${sortOrder}`}
                  onValueChange={(v) => {
                    const [field, order] = v.split("-");
                    setSortBy(field as "position" | "title" | "year");
                    setSortOrder(order as "asc" | "desc");
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="position-asc">Position (1-N)</SelectItem>
                    <SelectItem value="position-desc">Position (N-1)</SelectItem>
                    <SelectItem value="title-asc">Title (A-Z)</SelectItem>
                    <SelectItem value="title-desc">Title (Z-A)</SelectItem>
                    <SelectItem value="year-desc">Release Year (Newest)</SelectItem>
                    <SelectItem value="year-asc">Release Year (Oldest)</SelectItem>
                  </SelectContent>
                </Select>

                {/* Clear Filters */}
                {activeFilterCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchQuery("");
                      setFilterType("all");
                      setSortBy("position");
                      setSortOrder("asc");
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>

              {/* Items Grid */}
              {filteredAndSortedItems.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                  {filteredAndSortedItems.map((item) => {
                    const isMovie = "title" in item;
                    return (
                      <div key={`${item.id}-${item.originalIndex}`} className="relative">
                        {/* Position Badge */}
                        <div className="absolute top-2 left-2 z-10">
                          <Badge className="bg-black/80 text-white font-bold">
                            #{item.position}
                          </Badge>
                        </div>
                        <MovieCard
                          item={item}
                          type={isMovie ? "movie" : "tv"}
                          variant="default"
                          onCardClick={() => setSelectedItem({ item, type: isMovie ? "movie" : "tv" })}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No items match your filters.</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">This list is empty.</p>
            </div>
          )}

          {/* Comments Section */}
          {(list.visibility === "PUBLIC" || list.visibility === "FOLLOWERS_ONLY") && (
            <div className="mt-12 border-t pt-8">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-2xl font-bold mb-6">Comments</h2>

                {/* Comment Input */}
                {currentUser && (
                  <div className="mb-6">
                    <Textarea
                      placeholder="Add a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[100px] mb-2"
                    />
                    <div className="flex justify-end">
                      <Button
                        onClick={handlePostComment}
                        disabled={!newComment.trim() || createComment.isPending}
                        className="cursor-pointer"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Post Comment
                      </Button>
                    </div>
                  </div>
                )}

                {/* Comment Filter */}
                <div className="mb-4">
                  <Tabs value={commentFilter} onValueChange={setCommentFilter}>
                    <TabsList>
                      <TabsTrigger value="newest" className="cursor-pointer">Newest</TabsTrigger>
                      <TabsTrigger value="oldest" className="cursor-pointer">Oldest</TabsTrigger>
                      <TabsTrigger value="most-liked" className="cursor-pointer">Most Liked</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>

                {/* Comments List */}
                {commentsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex gap-3">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-16 w-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No comments yet. Be the first to comment!</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {comments.map((comment) => (
                      <CommentItem
                        key={comment.id}
                        comment={comment}
                        currentUser={currentUser}
                        onDelete={handleDeleteComment}
                        onEdit={handleEditComment}
                        editingCommentId={editingCommentId}
                        editingContent={editingContent}
                        onEditingContentChange={setEditingContent}
                        onStartEdit={(id: string, content: string) => {
                          setEditingCommentId(id);
                          setEditingContent(content);
                        }}
                        onCancelEdit={() => {
                          setEditingCommentId(null);
                          setEditingContent("");
                        }}
                        replyingTo={replyingTo}
                        replyContent={replyContent}
                        onReply={(commentId: string) => {
                          setReplyingTo(commentId);
                          setReplyContent("");
                        }}
                        onReplyContentChange={setReplyContent}
                        onPostReply={handlePostReply}
                        onCancelReply={() => {
                          setReplyingTo(null);
                          setReplyContent("");
                        }}
                        listId={list.id}
                        isListOwner={isOwner}
                        onBlockUser={handleBlockUser}
                        onUnblockUser={handleUnblockUser}
                        isUserBlocked={list.blockedUsers?.includes(comment.userId) || false}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {isOwner && list && (
        <CreateListModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          list={list}
        />
      )}

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete List</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{list.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground cursor-pointer">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Content Detail Modal */}
      {selectedItem && (
        <ContentDetailModal
          item={selectedItem.item}
          type={selectedItem.type}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </>
  );
}

// Comment Item Component
interface CommentItemProps {
  comment: ListComment;
  currentUser: { id: string; username: string; displayName: string | null; avatarUrl: string | null } | null;
  onDelete: (commentId: string) => void;
  onEdit: (commentId: string) => Promise<void>;
  editingCommentId: string | null;
  editingContent: string;
  onEditingContentChange: (content: string) => void;
  onStartEdit: (id: string, content: string) => void;
  onCancelEdit: () => void;
  replyingTo: string | null;
  replyContent: string;
  onReply: (commentId: string) => void;
  onReplyContentChange: (content: string) => void;
  onPostReply: (parentCommentId: string) => void;
  onCancelReply: () => void;
  listId: string;
  isListOwner: boolean;
  onBlockUser: (userId: string) => void;
  onUnblockUser: (userId: string) => void;
  isUserBlocked: boolean;
}

function CommentItem({
  comment,
  currentUser,
  onDelete,
  onEdit,
  editingCommentId,
  editingContent,
  onEditingContentChange,
  onStartEdit,
  onCancelEdit,
  replyingTo,
  replyContent,
  onReply,
  onReplyContentChange,
  onPostReply,
  onCancelReply,
  listId,
  isListOwner,
  onBlockUser,
  onUnblockUser,
  isUserBlocked,
}: CommentItemProps) {
  const isOwner = currentUser?.id === comment.userId;
  const isReplying = replyingTo === comment.id;
  const isEditing = editingCommentId === comment.id;
  const displayName = comment.user.displayName || comment.user.username || "Unknown";
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const addReaction = useAddListCommentReaction();
  const removeReaction = useRemoveListCommentReaction();

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showEmojiPicker]);

  // Group reactions by type
  const reactions = comment.reactions || [];
  const reactionsByType = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.reactionType]) {
      acc[reaction.reactionType] = [];
    }
    acc[reaction.reactionType]!.push(reaction);
    return acc;
  }, {} as Record<string, typeof reactions>);

  // Check if current user has reacted
  const userReactions = currentUser
    ? reactions.filter((r) => r.userId === currentUser.id)
    : [];
  const hasLiked = userReactions.some((r) => r.reactionType === "like");
  const userEmojiReactions = userReactions.filter((r) => r.reactionType !== "like");

  const handleToggleLike = async () => {
    if (!currentUser) return;
    
    try {
      if (hasLiked) {
        await removeReaction.mutateAsync({
          listId,
          commentId: comment.id,
          reactionType: "like",
        });
      } else {
        await addReaction.mutateAsync({
          listId,
          commentId: comment.id,
          reactionType: "like",
        });
      }
    } catch {
      toast.error("Failed to toggle like");
    }
  };

  const handleEmojiClick = async (emojiData: EmojiClickData) => {
    if (!currentUser) return;
    
    const emoji = emojiData.emoji;
    const existingReaction = userEmojiReactions.find((r) => r.reactionType === emoji);
    
    try {
      if (existingReaction) {
        await removeReaction.mutateAsync({
          listId,
          commentId: comment.id,
          reactionType: emoji,
        });
      } else {
        await addReaction.mutateAsync({
          listId,
          commentId: comment.id,
          reactionType: emoji,
        });
      }
      setShowEmojiPicker(false);
    } catch {
      toast.error("Failed to add reaction");
    }
  };

  const handleRemoveEmojiReaction = async (reactionType: string) => {
    if (!currentUser) return;
    
    try {
      await removeReaction.mutateAsync({
        listId,
        commentId: comment.id,
        reactionType,
      });
    } catch {
      toast.error("Failed to remove reaction");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Link href={`/users/${comment.user.id}`}>
          <Avatar className="h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity">
            <AvatarImage src={comment.user.avatarUrl || undefined} />
            <AvatarFallback>{displayName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <Link href={`/users/${comment.user.id}`}>
                <p className="font-medium text-sm hover:underline cursor-pointer">{displayName}</p>
              </Link>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
              </p>
            </div>
            {(isOwner || isListOwner) && (
              <div className="flex items-center gap-1">
                {isOwner && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onStartEdit(comment.id, comment.content)}
                      className="h-7 px-2 cursor-pointer"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(comment.id)}
                      className="h-7 px-2 text-destructive hover:text-destructive cursor-pointer"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
                {isListOwner && !isOwner && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Are you sure you want to ${isUserBlocked ? "unblock" : "block"} this user from commenting?`)) {
                          if (isUserBlocked) {
                            onUnblockUser(comment.userId);
                          } else {
                            onBlockUser(comment.userId);
                          }
                        }
                      }}
                      className="h-7 px-2 text-destructive hover:text-destructive cursor-pointer"
                      title={isUserBlocked ? "Unblock user" : "Block user from commenting"}
                    >
                      {isUserBlocked ? <UserX className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this comment?")) {
                          onDelete(comment.id);
                        }
                      }}
                      className="h-7 px-2 text-destructive hover:text-destructive cursor-pointer"
                      title="Delete comment"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <Textarea
                value={editingContent}
                onChange={(e) => onEditingContentChange(e.target.value)}
                className="min-h-[80px]"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => onEdit(comment.id)}
                  disabled={!editingContent.trim()}
                  className="cursor-pointer"
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCancelEdit}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>
          )}

          {!isEditing && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
              {currentUser && (
                <button
                  onClick={() => onReply(comment.id)}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <Reply className="h-3.5 w-3.5" />
                  Reply
                </button>
              )}
              
              {/* Reactions */}
              <div className="flex items-center gap-2">
                {/* Like button */}
                {currentUser && (
                  <button
                    onClick={handleToggleLike}
                    className={cn(
                      "flex items-center gap-1 hover:text-foreground transition-colors",
                      hasLiked && "text-red-500"
                    )}
                    disabled={addReaction.isPending || removeReaction.isPending}
                  >
                    <Heart className={cn("h-3.5 w-3.5", hasLiked && "fill-current")} />
                    {comment.likes > 0 && <span>{comment.likes}</span>}
                  </button>
                )}
                
                {/* Emoji picker button */}
                {currentUser && (
                  <div className="relative" ref={emojiPickerRef}>
                    <button
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="flex items-center gap-1 hover:text-foreground transition-colors"
                    >
                      <Smile className="h-3.5 w-3.5" />
                    </button>
                    {showEmojiPicker && (
                      <div className="absolute bottom-full left-0 mb-2 z-50">
                        <div className="relative">
                          <EmojiPicker
                            onEmojiClick={handleEmojiClick}
                            width={300}
                            height={400}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Display emoji reactions */}
                {Object.entries(reactionsByType)
                  .filter(([type]) => type !== "like")
                  .map(([emoji, reactions]) => {
                    const userHasReacted = userEmojiReactions.some((r) => r.reactionType === emoji);
                    return (
                      <button
                        key={emoji}
                        onClick={() =>
                          userHasReacted
                            ? handleRemoveEmojiReaction(emoji)
                            : handleEmojiClick({ emoji } as EmojiClickData)
                        }
                        className={cn(
                          "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs hover:bg-muted transition-colors",
                          userHasReacted && "bg-muted"
                        )}
                        title={`${reactions.length} ${emoji}`}
                      >
                        <span>{emoji}</span>
                        {reactions.length > 1 && <span>{reactions.length}</span>}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Reply Input */}
          {isReplying && (
            <div className="mt-3 ml-4 space-y-2">
              <Textarea
                placeholder="Write a reply..."
                value={replyContent}
                onChange={(e) => onReplyContentChange(e.target.value)}
                className="min-h-[80px]"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => onPostReply(comment.id)}
                  disabled={!replyContent.trim()}
                  className="cursor-pointer"
                >
                  <Send className="h-3 w-3 mr-1" />
                  Reply
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCancelReply}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Replies */}
          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-4 ml-4 space-y-4 border-l-2 pl-4">
              {comment.replies.map((reply) => {
                const replyDisplayName = reply.user.displayName || reply.user.username || "Unknown";
                const replyIsOwner = currentUser?.id === reply.userId;
                return (
                  <div key={reply.id} className="flex gap-3">
                    <Link href={`/users/${reply.user.id}`}>
                      <Avatar className="h-7 w-7 cursor-pointer hover:opacity-80 transition-opacity">
                        <AvatarImage src={reply.user.avatarUrl || undefined} />
                        <AvatarFallback>{replyDisplayName.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <Link href={`/users/${reply.user.id}`}>
                            <p className="font-medium text-sm hover:underline cursor-pointer">{replyDisplayName}</p>
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        {(replyIsOwner || isListOwner) && (
                          <div className="flex items-center gap-1">
                            {isListOwner && !replyIsOwner && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this reply?")) {
                                    onDelete(reply.id);
                                  }
                                }}
                                className="h-7 px-2 text-destructive hover:text-destructive cursor-pointer"
                                title="Delete reply"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                            {replyIsOwner && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onDelete(reply.id)}
                                className="h-7 px-2 text-destructive hover:text-destructive cursor-pointer"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap break-words">{reply.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

