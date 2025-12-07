import type { WatchlistItem } from "@/hooks/use-watchlist";

export interface WatchlistEntry {
  item: unknown;
  type: "movie" | "tv";
  watchlistItem: WatchlistItem;
}

/**
 * Reorders watchlist entries and returns updated order values for ALL items
 * This ensures that when reordering filtered items, all items in the watchlist get updated orders
 * 
 * Strategy:
 * 1. Reorder the filtered items based on drag operation
 * 2. Get all non-filtered items from the full list
 * 3. Place reordered filtered items first, then non-filtered items
 * 4. Assign sequential orders to all items
 */
export function reorderWatchlistEntries(
  filteredEntries: WatchlistEntry[],
  allEntries: WatchlistEntry[],
  sourceIndex: number,
  destinationIndex: number
): Array<{ id: string; order: number }> {
  if (sourceIndex === destinationIndex) {
    return [];
  }

  // Create a set of filtered item IDs for quick lookup
  const filteredIds = new Set(
    filteredEntries.map((entry) => entry.watchlistItem.id)
  );

  // Reorder the filtered items based on the drag operation
  const reorderedFiltered = [...filteredEntries];
  const [draggedItem] = reorderedFiltered.splice(sourceIndex, 1);
  reorderedFiltered.splice(destinationIndex, 0, draggedItem);

  // Get all non-filtered items from the full list (maintaining their order)
  const nonFilteredInFull = allEntries.filter(
    (entry) => !filteredIds.has(entry.watchlistItem.id)
  );

  // Build the final order: reordered filtered items first, then non-filtered items
  // This ensures filtered items get orders 1-N, and non-filtered items get orders N+1 onwards
  const finalOrder: WatchlistEntry[] = [...reorderedFiltered, ...nonFilteredInFull];

  // Return order updates for all items
  return finalOrder.map((entry, index) => ({
    id: entry.watchlistItem.id,
    order: index + 1,
  }));
}

