import { useCallback } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { useReorderWatchlist } from "./use-watchlist";
import { reorderWatchlistEntries, type WatchlistEntry } from "@/lib/watchlist-utils";

interface UseWatchlistDragDropOptions {
  entries: WatchlistEntry[];
  isEditMode: boolean;
  isLgScreen: boolean;
  onReorder?: () => void;
}

export function useWatchlistDragDrop({
  entries,
  isEditMode,
  isLgScreen,
  onReorder,
}: UseWatchlistDragDropOptions) {
  const reorderWatchlist = useReorderWatchlist();

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      // Early returns for invalid drag operations
      if (!result.destination) {
        return;
      }
      
      if (!isEditMode || !isLgScreen) {
        return;
      }

      const { source, destination } = result;
      
      if (source.index === destination.index) {
        return;
      }

      // Calculate new order values
      const itemsToUpdate = reorderWatchlistEntries(
        entries,
        source.index,
        destination.index
      );

      if (itemsToUpdate.length === 0) {
        return;
      }

      // Trigger mutation with proper callbacks
      reorderWatchlist.mutate(itemsToUpdate, {
        onSuccess: () => {
          toast.success("Watchlist reordered");
          onReorder?.();
        },
        onError: (error) => {
          toast.error("Failed to reorder watchlist");
          console.error("Reorder error:", error);
        },
      });
    },
    [entries, isEditMode, isLgScreen, reorderWatchlist, onReorder]
  );

  return {
    DragDropContext,
    handleDragEnd,
    isDragEnabled: isEditMode && isLgScreen,
  };
}

