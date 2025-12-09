import { useCallback } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
import { toast } from "sonner";
import { useReorderPlaylist } from "./use-playlists";
import { reorderPlaylistEntries, type PlaylistEntry } from "@/lib/playlist-utils";

interface UsePlaylistDragDropOptions {
  playlistId: string;
  filteredEntries: PlaylistEntry[];
  allEntries: PlaylistEntry[];
  isEditMode: boolean;
  isLgScreen: boolean;
  sortField: string;
  onReorder?: () => void;
  itemType?: "tmdb" | "youtube";
  currentPage?: number;
  itemsPerPage?: number;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onLocalReorder?: (sourceIndex: number, destinationIndex: number) => void;
}

export function usePlaylistDragDrop({
  playlistId,
  filteredEntries,
  allEntries,
  isEditMode,
  isLgScreen,
  sortField,
  onReorder,
  itemType = "tmdb",
  currentPage = 1,
  itemsPerPage = 25,
  onDragStart,
  onDragEnd: onDragEndCallback,
  onLocalReorder,
}: UsePlaylistDragDropOptions) {
  const reorderPlaylist = useReorderPlaylist(playlistId, itemType);

  const handleDragStart = useCallback(() => {
    onDragStart?.();
  }, [onDragStart]);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      // Always call onDragEndCallback to reset drag state
      onDragEndCallback?.();

      // Early returns for invalid drag operations
      if (!result.destination) {
        return;
      }
      
      if (!isEditMode || !isLgScreen || sortField !== "listOrder") {
        return;
      }

      const { source, destination } = result;
      
      if (source.index === destination.index) {
        return;
      }

      // When pagination is disabled (drag enabled), indices are already global
      // Otherwise, convert page-local indices to global indices in filteredEntries
      const globalSourceIndex = currentPage > 1 && itemsPerPage > 0
        ? (currentPage - 1) * itemsPerPage + source.index
        : source.index;
      const globalDestinationIndex = currentPage > 1 && itemsPerPage > 0
        ? (currentPage - 1) * itemsPerPage + destination.index
        : destination.index;

      // Calculate new order values for ALL items using global indices (for API call)
      const itemsToUpdate = reorderPlaylistEntries(
        filteredEntries,
        allEntries,
        globalSourceIndex,
        globalDestinationIndex
      );

      if (itemsToUpdate.length === 0) {
        return;
      }

      // Trello-style: Update local state FIRST (synchronously) for immediate UI update
      // Pass the source and destination indices from the filtered array
      // The reorder function will handle mapping to the full array
      if (onLocalReorder) {
        onLocalReorder(globalSourceIndex, globalDestinationIndex);
      }

      if (itemsToUpdate.length === 0) {
        return;
      }

      // Then trigger mutation (background API call)
      reorderPlaylist.mutate(itemsToUpdate, {
        onSuccess: () => {
          toast.success("Playlist reordered");
          onReorder?.();
        },
        onError: (error) => {
          console.error("Reorder error:", error);
          toast.error("Failed to reorder playlist");
        },
      });
    },
    [playlistId, filteredEntries, allEntries, isEditMode, isLgScreen, sortField, reorderPlaylist, onReorder, currentPage, itemsPerPage, onDragEndCallback, onLocalReorder]
  );

  return {
    DragDropContext,
    handleDragEnd,
    handleDragStart,
    isDragEnabled: isEditMode && isLgScreen && sortField === "listOrder",
  };
}

