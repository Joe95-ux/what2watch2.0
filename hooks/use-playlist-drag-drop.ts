import { useCallback, useState, useEffect } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";
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
}

export function usePlaylistDragDrop({
  playlistId,
  filteredEntries: initialFilteredEntries,
  allEntries,
  isEditMode,
  isLgScreen,
  sortField,
  itemType = "tmdb",
}: UsePlaylistDragDropOptions) {
  // Local state for UI - makes drag "stick" immediately
  const [displayedEntries, setDisplayedEntries] = useState<PlaylistEntry[]>(initialFilteredEntries);
  
  const reorderPlaylist = useReorderPlaylist(playlistId, itemType);

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

      // 2. Calculate order updates for ALL items (for API)
      const itemsToUpdate = reorderPlaylistEntries(
        initialFilteredEntries, // Use original filtered entries for calculation
        allEntries,
        source.index,
        destination.index
      );

      if (itemsToUpdate.length === 0) return;

      // 3. Send to API (optimistic update happens in the mutation)
      reorderPlaylist.mutate(itemsToUpdate, {
        onError: (error) => {
          // Revert UI on error
          setDisplayedEntries(initialFilteredEntries);
        },
      });
    },
    [
      playlistId, 
      displayedEntries, 
      initialFilteredEntries, 
      allEntries, 
      isEditMode, 
      isLgScreen, 
      sortField, 
      reorderPlaylist, 
      itemType
    ]
  );

  return {
    DragDropContext,
    handleDragEnd,
    isDragEnabled: isEditMode && isLgScreen && sortField === "listOrder",
    displayedEntries,
  };
}