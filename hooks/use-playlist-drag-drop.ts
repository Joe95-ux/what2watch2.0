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
    console.log("[usePlaylistDragDrop] Drag started:", {
      itemType,
      filteredEntriesCount: filteredEntries.length,
      allEntriesCount: allEntries.length,
      timestamp: new Date().toISOString(),
    });
    onDragStart?.();
  }, [onDragStart, itemType, filteredEntries.length, allEntries.length]);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      console.log("[usePlaylistDragDrop] Drag ended:", {
        itemType,
        source: result.source,
        destination: result.destination,
        timestamp: new Date().toISOString(),
      });

      // Early returns for invalid drag operations
      if (!result.destination) {
        console.log("[usePlaylistDragDrop] No destination, aborting");
        onDragEndCallback?.();
        return;
      }
      
      if (!isEditMode || !isLgScreen || sortField !== "listOrder") {
        console.log("[usePlaylistDragDrop] Drag not enabled:", {
          isEditMode,
          isLgScreen,
          sortField,
        });
        onDragEndCallback?.();
        return;
      }

      const { source, destination } = result;
      
      if (source.index === destination.index) {
        console.log("[usePlaylistDragDrop] Same position, aborting");
        onDragEndCallback?.();
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

      console.log("[usePlaylistDragDrop] Calculated indices:", {
        sourceIndex: source.index,
        destinationIndex: destination.index,
        globalSourceIndex,
        globalDestinationIndex,
        currentPage,
        itemsPerPage,
      });

      // Calculate new order values for ALL items using global indices (for API call)
      const itemsToUpdate = reorderPlaylistEntries(
        filteredEntries,
        allEntries,
        globalSourceIndex,
        globalDestinationIndex
      );

      console.log("[usePlaylistDragDrop] Items to update:", {
        count: itemsToUpdate.length,
        firstFew: itemsToUpdate.slice(0, 3).map(i => ({ id: i.id, order: i.order })),
      });

      if (itemsToUpdate.length === 0) {
        console.log("[usePlaylistDragDrop] No items to update, aborting");
        onDragEndCallback?.();
        return;
      }

      // Trello-style: Update local state FIRST (synchronously) for immediate UI update
      // This MUST happen before onDragEndCallback to ensure the component re-renders with updated local state
      if (onLocalReorder) {
        console.log("[usePlaylistDragDrop] Calling onLocalReorder:", {
          globalSourceIndex,
          globalDestinationIndex,
        });
        onLocalReorder(globalSourceIndex, globalDestinationIndex);
      } else {
        console.warn("[usePlaylistDragDrop] onLocalReorder not provided!");
      }

      // Reset drag state AFTER local state update
      // Use setTimeout to ensure local state update is applied first in React's render cycle
      setTimeout(() => {
        onDragEndCallback?.();
      }, 0);

      // Then trigger mutation (background API call)
      console.log("[usePlaylistDragDrop] Triggering mutation...");
      reorderPlaylist.mutate(itemsToUpdate, {
        onSuccess: () => {
          console.log("[usePlaylistDragDrop] Mutation successful");
          toast.success("Playlist reordered");
          onReorder?.();
        },
        onError: (error) => {
          console.error("[usePlaylistDragDrop] Mutation error:", error);
          toast.error("Failed to reorder playlist");
        },
      });
    },
    [playlistId, filteredEntries, allEntries, isEditMode, isLgScreen, sortField, reorderPlaylist, onReorder, currentPage, itemsPerPage, onDragEndCallback, onLocalReorder, itemType]
  );

  return {
    DragDropContext,
    handleDragEnd,
    handleDragStart,
    isDragEnabled: isEditMode && isLgScreen && sortField === "listOrder",
  };
}

