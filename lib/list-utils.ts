import type { ListItem } from "@/hooks/use-lists";

export interface ListEntry {
  item: unknown;
  type: "movie" | "tv";
  listItem: ListItem;
}

/**
 * Reorders list entries and returns updated position values for ALL items
 * This ensures that when reordering filtered items, all items in the list get updated positions
 * 
 * Strategy:
 * 1. Reorder the filtered items based on drag operation
 * 2. Get all non-filtered items from the full list
 * 3. Place reordered filtered items first, then non-filtered items
 * 4. Assign sequential positions to all items
 */
export function reorderListEntries(
  filteredEntries: ListEntry[],
  allEntries: ListEntry[],
  sourceIndex: number,
  destinationIndex: number
): Array<{ id: string; position: number }> {
  if (sourceIndex === destinationIndex) {
    return [];
  }

  // Create a set of filtered item IDs for quick lookup
  const filteredIds = new Set(
    filteredEntries.map((entry) => entry.listItem.id)
  );

  // Reorder the filtered items based on the drag operation
  const reorderedFiltered = [...filteredEntries];
  const [draggedItem] = reorderedFiltered.splice(sourceIndex, 1);
  reorderedFiltered.splice(destinationIndex, 0, draggedItem);

  // Get all non-filtered items from the full list (maintaining their order)
  const nonFilteredInFull = allEntries.filter(
    (entry) => !filteredIds.has(entry.listItem.id)
  );

  // Build the final order: reordered filtered items first, then non-filtered items
  // This ensures filtered items get positions 1-N, and non-filtered items get positions N+1 onwards
  const finalOrder: ListEntry[] = [...reorderedFiltered, ...nonFilteredInFull];

  // Return position updates for all items
  return finalOrder.map((entry, index) => ({
    id: entry.listItem.id,
    position: index + 1,
  }));
}

