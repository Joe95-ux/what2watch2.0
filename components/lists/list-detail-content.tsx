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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const isOwner = currentUser?.id === list?.userId;

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

  const handleRemove = async (itemId: string) => {
    try {
      await removeItemFromList.mutateAsync({ listId, itemId });
      toast.success("Removed from list");
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

