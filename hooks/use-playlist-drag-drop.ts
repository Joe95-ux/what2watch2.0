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
  itemType?: "tmdb" | "youtube";
  currentPage?: number;
  itemsPerPage?: number;
}

export function usePlaylistDragDrop({
  playlistId,
  filteredEntries,
  allEntries,
  isEditMode,
  isLgScreen,
  sortField,
  itemType = "tmdb",
  currentPage = 1,
  itemsPerPage = 25,
}: UsePlaylistDragDropOptions) {
  const reorderPlaylist = useReorderPlaylist(playlistId, itemType);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      // Early returns
      if (!result.destination) return;
      if (!isEditMode || !isLgScreen || sortField !== "listOrder") return;
      if (result.source.index === result.destination.index) return;

      const { source, destination } = result;

      // Convert page-local indices to global indices if paginated
      const globalSourceIndex = currentPage > 1 && itemsPerPage > 0
        ? (currentPage - 1) * itemsPerPage + source.index
        : source.index;
      const globalDestinationIndex = currentPage > 1 && itemsPerPage > 0
        ? (currentPage - 1) * itemsPerPage + destination.index
        : destination.index;

      // Calculate new order values for all items
      const itemsToUpdate = reorderPlaylistEntries(
        filteredEntries,
        allEntries,
        globalSourceIndex,
        globalDestinationIndex
      );

      if (itemsToUpdate.length === 0) return;

      // Trigger mutation (optimistic update happens in the mutation)
      reorderPlaylist.mutate(itemsToUpdate);
    },
    [playlistId, filteredEntries, allEntries, isEditMode, isLgScreen, sortField, reorderPlaylist, currentPage, itemsPerPage, itemType]
  );

  return {
    DragDropContext,
    handleDragEnd,
    isDragEnabled: isEditMode && isLgScreen && sortField === "listOrder",
  };
}