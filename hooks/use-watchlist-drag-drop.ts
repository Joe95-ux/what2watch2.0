import { useCallback, useState, useEffect } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { useReorderWatchlist } from "./use-watchlist";
import { reorderWatchlistEntries, type WatchlistEntry } from "@/lib/watchlist-utils";

interface UseWatchlistDragDropOptions {
  filteredEntries: WatchlistEntry[];
  allEntries: WatchlistEntry[];
  isEditMode: boolean;
  isLgScreen: boolean;
  onReorder?: () => void;
}

export function useWatchlistDragDrop({
  filteredEntries: initialFilteredEntries,
  allEntries,
  isEditMode,
  isLgScreen,
  onReorder,
}: UseWatchlistDragDropOptions) {
  // Local state for UI - makes drag "stick" immediately
  const [displayedEntries, setDisplayedEntries] = useState<WatchlistEntry[]>(initialFilteredEntries);
  
  const reorderWatchlist = useReorderWatchlist();

  // Sync with parent when initialFilteredEntries changes
  useEffect(() => {
    setDisplayedEntries(initialFilteredEntries);
  }, [initialFilteredEntries]);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      // Early returns
      if (!result.destination) return;
      if (!isEditMode || !isLgScreen) return;
      if (result.source.index === result.destination.index) return;

      const { source, destination } = result;

      // 1. IMMEDIATELY reorder the UI items - this prevents snap-back
      const reorderedDisplay = [...displayedEntries];
      const [draggedItem] = reorderedDisplay.splice(source.index, 1);
      reorderedDisplay.splice(destination.index, 0, draggedItem);
      
      // Update local state - UI re-renders instantly
      setDisplayedEntries(reorderedDisplay);

      // 2. Calculate order updates for ALL items (for API)
      const itemsToUpdate = reorderWatchlistEntries(
        initialFilteredEntries, // Use original filtered entries for calculation
        allEntries,
        source.index,
        destination.index
      );

      if (itemsToUpdate.length === 0) return;

      // 3. Send to API (optimistic update happens in the mutation)
      reorderWatchlist.mutate(itemsToUpdate, {
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
      displayedEntries,
      initialFilteredEntries,
      allEntries,
      isEditMode,
      isLgScreen,
      reorderWatchlist,
      onReorder
    ]
  );

  return {
    DragDropContext,
    handleDragEnd,
    isDragEnabled: isEditMode && isLgScreen,
    displayedEntries,
  };
}

