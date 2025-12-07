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
    async (result: DropResult) => {
      if (!result.destination) return;
      if (!isEditMode || !isLgScreen) return;

      const { source, destination } = result;
      if (source.index === destination.index) return;

      const itemsToUpdate = reorderWatchlistEntries(
        entries,
        source.index,
        destination.index
      );

      try {
        await reorderWatchlist.mutateAsync(itemsToUpdate);
        toast.success("Watchlist reordered");
        onReorder?.();
      } catch (error) {
        toast.error("Failed to reorder watchlist");
        console.error(error);
      }
    },
    [entries, isEditMode, isLgScreen, reorderWatchlist, onReorder]
  );

  return {
    DragDropContext,
    handleDragEnd,
    isDragEnabled: isEditMode && isLgScreen,
  };
}

