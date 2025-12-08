import { useCallback } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { useReorderList } from "./use-lists";
import { reorderListEntries, type ListEntry } from "@/lib/list-utils";

interface UseListDragDropOptions {
  listId: string;
  filteredEntries: ListEntry[];
  allEntries: ListEntry[];
  isEditMode: boolean;
  isLgScreen: boolean;
  sortField: string;
  onReorder?: () => void;
}

export function useListDragDrop({
  listId,
  filteredEntries,
  allEntries,
  isEditMode,
  isLgScreen,
  sortField,
  onReorder,
}: UseListDragDropOptions) {
  const reorderList = useReorderList(listId);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      // Early returns for invalid drag operations
      if (!result.destination) {
        console.log("Drag cancelled: no destination");
        return;
      }
      
      if (!isEditMode || !isLgScreen || sortField !== "listOrder") {
        console.log("Drag cancelled: not in edit mode, not lg screen, or not list order sort", { isEditMode, isLgScreen, sortField });
        return;
      }

      const { source, destination } = result;
      
      if (source.index === destination.index) {
        console.log("Drag cancelled: same index");
        return;
      }

      console.log("Drag operation:", {
        sourceIndex: source.index,
        destinationIndex: destination.index,
        filteredCount: filteredEntries.length,
        allCount: allEntries.length,
      });

      // Calculate new position values for ALL items
      const itemsToUpdate = reorderListEntries(
        filteredEntries,
        allEntries,
        source.index,
        destination.index
      );

      console.log("Items to update:", itemsToUpdate.length, itemsToUpdate.slice(0, 5));

      if (itemsToUpdate.length === 0) {
        console.log("No items to update");
        return;
      }

      // Trigger mutation with proper callbacks
      reorderList.mutate(itemsToUpdate, {
        onSuccess: () => {
          console.log("Reorder successful");
          toast.success("List reordered");
          onReorder?.();
        },
        onError: (error) => {
          console.error("Reorder error:", error);
          toast.error("Failed to reorder list");
        },
      });
    },
    [listId, filteredEntries, allEntries, isEditMode, isLgScreen, sortField, reorderList, onReorder]
  );

  return {
    DragDropContext,
    handleDragEnd,
    isDragEnabled: isEditMode && isLgScreen && sortField === "listOrder",
  };
}

