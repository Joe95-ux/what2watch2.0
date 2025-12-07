import type { WatchlistItem } from "@/hooks/use-watchlist";

export interface WatchlistEntry {
  item: unknown;
  type: "movie" | "tv";
  watchlistItem: WatchlistItem;
}

/**
 * Reorders an array of watchlist entries and returns updated order values
 * Only updates order for items in the entries array, maintaining relative positions
 */
export function reorderWatchlistEntries(
  entries: WatchlistEntry[],
  sourceIndex: number,
  destinationIndex: number
): Array<{ id: string; order: number }> {
  if (sourceIndex === destinationIndex) {
    return [];
  }

  const reordered = [...entries];
  const [draggedItem] = reordered.splice(sourceIndex, 1);
  reordered.splice(destinationIndex, 0, draggedItem);

  // Return order updates for all items in the reordered array
  // Order is 1-based and sequential
  return reordered.map(({ watchlistItem }, index) => ({
    id: watchlistItem.id,
    order: index + 1,
  }));
}

