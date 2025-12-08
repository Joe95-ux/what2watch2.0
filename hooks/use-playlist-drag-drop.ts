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
}

export function usePlaylistDragDrop({
  playlistId,
  filteredEntries,
  allEntries,
  isEditMode,
  isLgScreen,
  sortField,
  onReorder,
}: UsePlaylistDragDropOptions) {
  const reorderPlaylist = useReorderPlaylist(playlistId);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      // Early returns for invalid drag operations
      if (!result.destination) {
        return;
      }
      
      if (!isEditMode || !isLgScreen || sortField !== "playlistOrder") {
        return;
      }

      const { source, destination } = result;
      
      if (source.index === destination.index) {
        return;
      }

      // Calculate new order values for ALL items
      const itemsToUpdate = reorderPlaylistEntries(
        filteredEntries,
        allEntries,
        source.index,
        destination.index
      );

      if (itemsToUpdate.length === 0) {
        return;
      }

      // Trigger mutation
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
    [playlistId, filteredEntries, allEntries, isEditMode, isLgScreen, sortField, reorderPlaylist, onReorder]
  );

  return {
    DragDropContext,
    handleDragEnd,
    isDragEnabled: isEditMode && isLgScreen && sortField === "playlistOrder",
  };
}

