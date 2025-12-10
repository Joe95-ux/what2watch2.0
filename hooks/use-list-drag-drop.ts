import { useCallback, useState, useEffect } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
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
  filteredEntries: initialFilteredEntries,
  allEntries,
  isEditMode,
  isLgScreen,
  sortField,
  onReorder,
}: UseListDragDropOptions) {
  // Local state for UI - makes drag "stick" immediately
  const [displayedEntries, setDisplayedEntries] = useState<ListEntry[]>(initialFilteredEntries);
  
  const reorderList = useReorderList(listId);

  // Sync with parent when initialFilteredEntries changes
  useEffect(() => {
    setDisplayedEntries(initialFilteredEntries);
  }, [initialFilteredEntries]);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      // Early returns
      if (!result.destination) return;
      if (!isEditMode || !isLgScreen || sortField !== "listOrder") return;
      if (result.source.index === result.destination.index) return;

      const { source, destination } = result;

      // 1. IMMEDIATELY reorder the UI items - this prevents snap-back
      const reorderedDisplay = [...displayedEntries];
      const [draggedItem] = reorderedDisplay.splice(source.index, 1);
      reorderedDisplay.splice(destination.index, 0, draggedItem);
      
      // Update local state - UI re-renders instantly
      setDisplayedEntries(reorderedDisplay);

      // 2. Calculate position updates for ALL items (for API)
      const itemsToUpdate = reorderListEntries(
        initialFilteredEntries, // Use original filtered entries for calculation
        allEntries,
        source.index,
        destination.index
      );

      if (itemsToUpdate.length === 0) return;

      // 3. Send to API (optimistic update happens in the mutation)
      reorderList.mutate(itemsToUpdate, {
        onSuccess: () => {
          onReorder?.();
        },
        onError: () => {
          // Revert UI on error
          setDisplayedEntries(initialFilteredEntries);
        },
      });
    },
    [
      listId,
      displayedEntries,
      initialFilteredEntries,
      allEntries,
      isEditMode,
      isLgScreen,
      sortField,
      reorderList,
      onReorder
    ]
  );

  return {
    DragDropContext,
    handleDragEnd,
    isDragEnabled: isEditMode && isLgScreen && sortField === "listOrder",
    displayedEntries,
  };
}

