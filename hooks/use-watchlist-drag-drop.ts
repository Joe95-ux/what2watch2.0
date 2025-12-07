import { useCallback } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";
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
  filteredEntries,
  allEntries,
  isEditMode,
  isLgScreen,
  onReorder,
}: UseWatchlistDragDropOptions) {
  const reorderWatchlist = useReorderWatchlist();

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      // Early returns for invalid drag operations
      if (!result.destination) {
        console.log("Drag cancelled: no destination");
        return;
      }
      
      if (!isEditMode || !isLgScreen) {
        console.log("Drag cancelled: not in edit mode or not lg screen", { isEditMode, isLgScreen });
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

      // Calculate new order values for ALL items
      const itemsToUpdate = reorderWatchlistEntries(
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
      reorderWatchlist.mutate(itemsToUpdate, {
        onSuccess: () => {
          console.log("Reorder successful");
          toast.success("Watchlist reordered");
          onReorder?.();
        },
        onError: (error) => {
          console.error("Reorder error:", error);
          toast.error("Failed to reorder watchlist");
        },
      });
    },
    [filteredEntries, allEntries, isEditMode, isLgScreen, reorderWatchlist, onReorder]
  );

  return {
    DragDropContext,
    handleDragEnd,
    isDragEnabled: isEditMode && isLgScreen,
  };
}

