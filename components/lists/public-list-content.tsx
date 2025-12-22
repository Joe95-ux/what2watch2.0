"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import ContentDetailModal from "@/components/browse/content-detail-modal";
import { useList, useDeleteList, useUpdateList } from "@/hooks/use-lists";
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
import { useListComments, useCreateListComment, useDeleteListComment, useUpdateListComment, type ListComment, useAddListCommentReaction, useRemoveListCommentReaction } from "@/hooks/use-list-comments";
import { Ban, UserX, Filter, Heart, Users } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useAvatar } from "@/contexts/avatar-context";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";
import { format, formatDistanceToNow } from "date-fns";
import CreateListModal from "./create-list-modal";
import ImportListModal from "./import-list-modal";
import { MessageSquare, Send, Edit2 as Edit, Trash2, Reply, Smile, ChevronDown, ChevronUp } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { cn } from "@/lib/utils";
import ListView from "./list-view";
import type { ListVisibility } from "@/hooks/use-lists";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { useLikeList, useUnlikeList, useIsListLiked } from "@/hooks/use-list-likes";
import { FollowButton } from "@/components/social/follow-button";

interface PublicListContentProps {
  listId: string;
}

export default function PublicListContent({ listId }: PublicListContentProps) {
  const router = useRouter();
  const { data: currentUser } = useCurrentUser();
  const deleteList = useDeleteList();
  const updateList = useUpdateList();
  const queryClient = useQueryClient();
  const { data: list, isLoading, error } = useList(listId);
  const [selectedItem, setSelectedItem] = useState<{ item: TMDBMovie | TMDBSeries; type: "movie" | "tv" } | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [commentFilter, setCommentFilter] = useState("newest");
  const [hasLoggedVisit, setHasLoggedVisit] = useState(false);

  const refreshList = () => {
    queryClient.invalidateQueries({ queryKey: ["list", listId] });
    queryClient.invalidateQueries({ queryKey: ["public-lists"] });
    queryClient.invalidateQueries({ queryKey: ["lists"] });
  };

  const isOwner = Boolean(currentUser?.id && list && currentUser.id === list.userId);

  // Track visit event when viewing a public list
  useEffect(() => {
    if (!list || hasLoggedVisit || isOwner) {
      return;
    }

    const controller = new AbortController();

    const logVisit = async () => {
      try {
        await fetch("/api/analytics/list-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listId: list.id,
            type: "VISIT",
            source: "public_view",
          }),
          signal: controller.signal,
        });
        setHasLoggedVisit(true);
      } catch (logError) {
        if ((logError as Error).name !== "AbortError") {
          console.error("Failed to log list visit", logError);
        }
      }
    };

    logVisit();

    return () => controller.abort();
  }, [list, hasLoggedVisit, isOwner]);

  // Comments functionality
  const { data: comments = [], isLoading: commentsLoading } = useListComments(list?.id || "", commentFilter);

  // Like functionality
  const { data: likeStatus } = useIsListLiked(list?.id || null);
  const likeList = useLikeList();
  const unlikeList = useUnlikeList();
  const isLiked = likeStatus?.isLiked || false;

  const handleToggleLike = async () => {
    if (!list || !currentUser) {
      toast.error("Please sign in to like lists");
      return;
    }
    try {
      if (isLiked) {
        await unlikeList.mutateAsync(list.id);
        toast.success("Removed from liked lists");
      } else {
        await likeList.mutateAsync(list.id);
        toast.success("Added to liked lists");
      }
      refreshList();
    } catch (error) {
      toast.error("Failed to update like status");
    }
  };

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
      refreshList();
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
      refreshList();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to unblock user";
      toast.error(errorMessage);
    }
  };

  // Note: Owners can access the public view to moderate comments
  // If they want the dashboard view, they can navigate there manually

  const handleTogglePublic = async (visibility: ListVisibility) => {
    if (!list) return;
    try {
      await updateList.mutateAsync({
        listId: list.id,
        visibility,
      });
    } catch {
      throw new Error("Failed to update list visibility");
    }
  };

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

  const shareUrl = typeof window !== "undefined" && list
    ? `${window.location.origin}/lists/${list.id}`
    : "";

  if (isLoading) {
    return null; // ListView handles loading
  }

  const errorMessage: string | null =
    error instanceof Error ? error.message : error ? String(error) : null;

  if (errorMessage || !list) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">List not found</h1>
          <p className="text-muted-foreground">{errorMessage || "This list doesn't exist or is private."}</p>
          <Button onClick={() => router.back()} className="cursor-pointer">Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <ListView
        list={list || null}
        isLoading={isLoading}
        isOwner={isOwner}
        enableRemove={false}
        enableEdit={isOwner}
        enableExport={isOwner}
        enablePublicToggle={isOwner}
        onTogglePublic={handleTogglePublic}
        shareUrl={shareUrl}
        emptyTitle="This list is empty"
        emptyDescription="No items have been added yet."
        errorTitle="List not found"
        errorDescription="This list doesn't exist or is private."
        onBack={() => router.push("/lists")}
        isLiked={isLiked}
        onToggleLike={handleToggleLike}
        isLikeLoading={likeList.isPending || unlikeList.isPending}
        likeUserId={currentUser?.id || null}
        showLikeFollow={!isOwner && list?.visibility !== "PRIVATE"}
      />

      {/* Comments Section */}
      {list && list.visibility !== "PRIVATE" && (
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 border-t">
          <ListCommentsSection
            listId={listId}
            comments={comments}
            isLoading={commentsLoading}
            filter={commentFilter}
            onFilterChange={setCommentFilter}
            currentUser={currentUser}
            isListOwner={isOwner}
            onBlockUser={handleBlockUser}
            onUnblockUser={handleUnblockUser}
            blockedUsers={list.blockedUsers || []}
          />
        </div>
      )}

      {/* Edit Modal */}
      {isOwner && list && (
        <>
          <CreateListModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            list={list}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["list", listId] });
            }}
          />
          <ImportListModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            listId={listId}
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["list", listId] });
            }}
          />
        </>
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

export interface ListCommentsSectionProps {
  listId: string;
  comments: ListComment[];
  isLoading: boolean;
  filter: string;
  onFilterChange: (filter: string) => void;
  currentUser: { id: string; username: string; displayName: string | null; avatarUrl: string | null } | null;
  isListOwner: boolean;
  onBlockUser: (userId: string) => void;
  onUnblockUser: (userId: string) => void;
  blockedUsers: string[];
}

export function ListCommentsSection({
  listId,
  comments,
  isLoading,
  filter,
  onFilterChange,
  currentUser,
  isListOwner,
  onBlockUser,
  onUnblockUser,
  blockedUsers,
}: ListCommentsSectionProps) {
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [replySubmittingId, setReplySubmittingId] = useState<string | null>(null);
  const [showAllComments, setShowAllComments] = useState(false);
  const createComment = useCreateListComment();
  const updateComment = useUpdateListComment();
  const deleteComment = useDeleteListComment();

  const primaryComments = useMemo(() => {
    const topLevel = comments.filter((comment) => !comment.parentCommentId);
    return topLevel.length > 0 ? topLevel : comments;
  }, [comments]);

  const COMMENTS_PER_PAGE = 10;
  const shouldShowToggle = primaryComments.length > COMMENTS_PER_PAGE;
  const displayedComments = showAllComments ? primaryComments : primaryComments.slice(0, COMMENTS_PER_PAGE);
  const remainingCount = Math.max(0, primaryComments.length - COMMENTS_PER_PAGE);

  useEffect(() => {
    setShowAllComments(false);
  }, [filter]);

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    try {
      await createComment.mutateAsync({
        listId,
        content: newComment.trim(),
      });
      setNewComment("");
      toast.success("Comment posted");
    } catch {
      toast.error("Failed to post comment");
    }
  };

  const handlePostReply = async (parentCommentId: string) => {
    if (!replyContent.trim()) return;
    try {
      setReplySubmittingId(parentCommentId);
      await createComment.mutateAsync({
        listId,
        content: replyContent.trim(),
        parentCommentId,
      });
      setReplyContent("");
      setReplyingTo(null);
      toast.success("Reply posted");
    } catch {
      toast.error("Failed to post reply");
    } finally {
      setReplySubmittingId(null);
    }
  };

  const handleEditComment = async (commentId: string, content: string) => {
    if (!content.trim()) return;
    try {
      await updateComment.mutateAsync({
        listId,
        commentId,
        content: content.trim(),
      });
      toast.success("Comment updated");
    } catch {
      toast.error("Failed to update comment");
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment.mutateAsync({ listId, commentId });
      toast.success("Comment deleted");
    } catch {
      toast.error("Failed to delete comment");
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-0">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <h3 className="text-2xl font-bold">Comments ({comments.length})</h3>
          <Select value={filter} onValueChange={onFilterChange}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="oldest">Oldest</SelectItem>
              <SelectItem value="most-liked">Most Liked</SelectItem>
            </SelectContent>
          </Select>
        </div>

      <div className="space-y-6">
        {currentUser && (
          <div className="flex items-start gap-3 pb-4 border-b border-border">
            <Avatar className="h-8 w-8">
              <AvatarImage src={currentUser.avatarUrl || undefined} />
              <AvatarFallback>
                {(currentUser.username || currentUser.displayName || "U").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <Textarea
                placeholder="Add a comment..."
                rows={3}
                className="resize-none"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
              />
              <Button
                size="sm"
                className="mt-2"
                onClick={handlePostComment}
                disabled={!newComment.trim() || createComment.isPending}
              >
                {createComment.isPending ? "Posting..." : "Post Comment"}
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
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
        ) : primaryComments.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          <>
            <div className="space-y-6">
              {displayedComments.map((comment) => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  currentUser={currentUser}
                  onDelete={handleDeleteComment}
                  onEdit={handleEditComment}
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
                  listId={listId}
                  isListOwner={isListOwner}
                  onBlockUser={onBlockUser}
                  onUnblockUser={onUnblockUser}
                  blockedUsers={blockedUsers}
                  replySubmittingId={replySubmittingId}
                />
              ))}

              {shouldShowToggle && (
                <div className="flex justify-center pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAllComments(!showAllComments)}
                    className="flex items-center gap-2"
                  >
                    {showAllComments ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        Show Less
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        Show More ({remainingCount} more)
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Comment Item Component
interface CommentItemProps {
  comment: ListComment;
  currentUser: { id: string; username: string; displayName: string | null; avatarUrl: string | null } | null;
  onDelete: (commentId: string) => void;
  onEdit: (commentId: string, content: string) => Promise<void>;
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
  blockedUsers: string[];
  replySubmittingId: string | null;
  depth?: number;
}

function CommentItem({
  comment,
  currentUser,
  onDelete,
  onEdit,
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
  blockedUsers,
  replySubmittingId,
  depth = 0,
}: CommentItemProps) {
  const { avatarUrl: contextAvatarUrl } = useAvatar();
  const isOwner = currentUser?.id === comment.userId;
  const isReplying = replyingTo === comment.id;
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(comment.content);
  const [isSaving, setIsSaving] = useState(false);
  const displayName = comment.user.username || comment.user.displayName || "Unknown";
  const isUserBlocked = blockedUsers.includes(comment.userId);
  const isCurrentUser = currentUser?.id === comment.user.id;
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const addReaction = useAddListCommentReaction();
  const removeReaction = useRemoveListCommentReaction();
  const replies = comment.replies || [];
  const isReplySubmitting = replySubmittingId === comment.id;

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

  useEffect(() => {
    if (!isEditing) {
      setEditContent(comment.content);
    }
  }, [comment.content, isEditing]);

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

  const handleSaveEdit = async () => {
    if (!editContent.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await onEdit(comment.id, editContent.trim());
      setIsEditing(false);
    } catch {
      // handled upstream
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={cn("space-y-4", depth > 0 && "ml-4 border-l border-border/60 pl-4")}>
      <div className="flex gap-3">
        <Link href={`/users/${comment.user.id}`}>
          <Avatar className="h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity">
            <AvatarImage 
              src={isCurrentUser && contextAvatarUrl ? contextAvatarUrl : comment.user.avatarUrl || undefined} 
            />
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
                      onClick={() => {
                        setIsEditing(true);
                        setEditContent(comment.content);
                      }}
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
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[80px]"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={!editContent.trim() || isSaving}
                >
                  {isSaving ? "Saving..." : "Save"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(comment.content);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm whitespace-pre-wrap break-words">{comment.content}</p>
          )}

          {!isEditing && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2 flex-wrap">
              {currentUser && (
                <button
                  onClick={() => onReply(comment.id)}
                  className="flex items-center gap-1 hover:text-foreground transition-colors"
                >
                  <Reply className="h-3.5 w-3.5" />
                  Reply
                </button>
              )}

              <div className="flex items-center gap-2 flex-wrap">
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
                        <EmojiPicker onEmojiClick={handleEmojiClick} width={300} height={400} />
                      </div>
                    )}
                  </div>
                )}

                {Object.entries(reactionsByType)
                  .filter(([type]) => type !== "like")
                  .map(([emoji, reactionList]) => {
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
                        title={`${reactionList.length} ${emoji}`}
                      >
                        <span>{emoji}</span>
                        {reactionList.length > 1 && <span>{reactionList.length}</span>}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

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
                  disabled={!replyContent.trim() || isReplySubmitting}
                >
                  <Send className="h-3 w-3 mr-1" />
                  {isReplySubmitting ? "Posting..." : "Reply"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCancelReply}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {replies.length > 0 && (
            <div className="space-y-4">
              {replies.map((reply) => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  currentUser={currentUser}
                  onDelete={onDelete}
                  onEdit={onEdit}
                  replyingTo={replyingTo}
                  replyContent={replyContent}
                  onReply={onReply}
                  onReplyContentChange={onReplyContentChange}
                  onPostReply={onPostReply}
                  onCancelReply={onCancelReply}
                  listId={listId}
                  isListOwner={isListOwner}
                  onBlockUser={onBlockUser}
                  onUnblockUser={onUnblockUser}
                  blockedUsers={blockedUsers}
                  replySubmittingId={replySubmittingId}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
