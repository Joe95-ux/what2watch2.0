"use client";

import { useList, useRemoveItemFromList, useUpdateList } from "@/hooks/use-lists";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
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
import CreateListModal from "./create-list-modal";
import ListView from "./list-view";
import type { ListVisibility } from "@/hooks/use-lists";
import { useListComments } from "@/hooks/use-list-comments";
import { Button } from "@/components/ui/button";
import { Heart, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLikeList, useUnlikeList, useIsListLiked } from "@/hooks/use-list-likes";
import { FollowButton } from "@/components/social/follow-button";
import { useQueryClient } from "@tanstack/react-query";
import { ListCommentsSection } from "./public-list-content";

interface ListDetailContentProps {
  listId: string;
}

export default function ListDetailContent({ listId }: ListDetailContentProps) {
  const { data: list, isLoading } = useList(listId);
  const { data: currentUser } = useCurrentUser();
  const deleteList = useDeleteList();
  const removeItemFromList = useRemoveItemFromList();
  const updateList = useUpdateList();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [commentFilter, setCommentFilter] = useState("newest");

  const isOwner = currentUser?.id === list?.userId;

  // Comments functionality
  const { data: comments = [] } = useListComments(list?.id || "", commentFilter);

  // Like functionality
  const { data: likeStatus } = useIsListLiked(list?.id || null);
  const likeList = useLikeList();
  const unlikeList = useUnlikeList();
  const isLiked = likeStatus?.isLiked || false;

  const refreshList = () => {
    queryClient.invalidateQueries({ queryKey: ["list", listId] });
  };

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

  // Block/unblock user handlers (for comments section)
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
    try {
      await deleteList.mutateAsync(listId);
      toast.success("List deleted");
      router.push("/dashboard/lists");
    } catch {
      toast.error("Failed to delete list");
    }
  };

  const handleRemove = async (itemId: string, suppressToast = false) => {
    try {
      await removeItemFromList.mutateAsync({ listId, itemId });
      if (!suppressToast) {
        toast.success("Removed from list");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to remove from list";
      toast.error(errorMessage);
    }
  };

  const shareUrl = typeof window !== "undefined" && list
    ? `${window.location.origin}/lists/${list.id}`
    : "";

  return (
    <>
      <ListView
        list={list || null}
        isLoading={isLoading}
        isOwner={isOwner}
        enableRemove={isOwner}
        enableEdit={isOwner}
        enableExport={isOwner}
        enablePublicToggle={isOwner}
        onTogglePublic={handleTogglePublic}
        onRemove={handleRemove}
        shareUrl={shareUrl}
        emptyTitle="This list is empty"
        emptyDescription="No items have been added yet."
        errorTitle="List not found"
        errorDescription="This list doesn't exist or is private."
        onBack={() => router.push("/dashboard/lists")}
      />

      {/* Like and Follow Counts for Owners */}
      {isOwner && list && list.visibility !== "PRIVATE" && (
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 border-t">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Heart className="h-4 w-4" />
              <span>
                {list._count?.likedBy || 0} {list._count?.likedBy === 1 ? "like" : "likes"}
              </span>
            </div>
            {list.user && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>Follow to see follower count</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Comments Section for Owners */}
      {isOwner && list && list.visibility !== "PRIVATE" && (
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 border-t">
          <ListCommentsSection
            listId={listId}
            comments={comments}
            isLoading={false}
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

      {isOwner && (
        <>
          <CreateListModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            list={list}
          />

          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete List</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;{list?.name}&quot;? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </>
  );
}

