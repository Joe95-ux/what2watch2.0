import type { WatchlistItem } from "@/hooks/use-watchlist";

export interface WatchlistEntry {
  item: unknown;
  type: "movie" | "tv";
  watchlistItem: WatchlistItem;
}

/**
 * Reorders an array of watchlist entries and returns updated order values
 */
export function reorderWatchlistEntries(
  entries: WatchlistEntry[],
  sourceIndex: number,
  destinationIndex: number
): Array<{ id: string; order: number }> {
  const reordered = [...entries];
  const [draggedItem] = reordered.splice(sourceIndex, 1);
  reordered.splice(destinationIndex, 0, draggedItem);

  return reordered.map(({ watchlistItem }, index) => ({
    id: watchlistItem.id,
    order: index + 1,
  }));
}

