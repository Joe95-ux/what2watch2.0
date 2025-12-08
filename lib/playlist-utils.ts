import type { PlaylistItem } from "@/hooks/use-playlists";

export interface PlaylistEntry {
  item: unknown;
  type: "movie" | "tv" | "youtube";
  playlistItem: PlaylistItem | { id: string; order: number; videoId?: string };
}

/**
 * Reorders playlist entries and returns updated order values for ALL items
 * This ensures that when reordering filtered items, all items in the playlist get updated orders
 * 
 * Strategy:
 * 1. Reorder the filtered items based on drag operation
 * 2. Get all non-filtered items from the full list
 * 3. Place reordered filtered items first, then non-filtered items
 * 4. Assign sequential orders to all items
 */
export function reorderPlaylistEntries(
  filteredEntries: PlaylistEntry[],
  allEntries: PlaylistEntry[],
  sourceIndex: number,
  destinationIndex: number
): Array<{ id: string; order: number }> {
  if (sourceIndex === destinationIndex) {
    return [];
  }

  // Create a set of filtered item IDs for quick lookup
  const filteredIds = new Set(
    filteredEntries.map((entry) => entry.playlistItem.id)
  );

  // Reorder the filtered items based on the drag operation
  const reorderedFiltered = [...filteredEntries];
  const [draggedItem] = reorderedFiltered.splice(sourceIndex, 1);
  reorderedFiltered.splice(destinationIndex, 0, draggedItem);

  // Get all non-filtered items from the full list (maintaining their order)
  const nonFilteredInFull = allEntries.filter(
    (entry) => !filteredIds.has(entry.playlistItem.id)
  );

  // Build the final order: reordered filtered items first, then non-filtered items
  // This ensures filtered items get orders 1-N, and non-filtered items get orders N+1 onwards
  const finalOrder: PlaylistEntry[] = [...reorderedFiltered, ...nonFilteredInFull];

  // Return order updates for all items
  return finalOrder.map((entry, index) => ({
    id: entry.playlistItem.id,
    order: index + 1,
  }));
}

