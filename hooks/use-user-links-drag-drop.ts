import { useCallback, useState, useEffect } from "react";
import { DragDropContext, DropResult } from "@hello-pangea/dnd";

export type UserLinkItem = {
  id: string;
  label: string;
  url: string;
  order: number;
  isActive: boolean;
  icon?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  clicks?: number;
};

interface UseUserLinksDragDropOptions {
  links: UserLinkItem[];
  onReorder?: () => void;
}

export function useUserLinksDragDrop({
  links: initialLinks,
  onReorder,
}: UseUserLinksDragDropOptions) {
  const sortedInitial = [...initialLinks].sort((a, b) => a.order - b.order);
  const [displayedLinks, setDisplayedLinks] = useState<UserLinkItem[]>(sortedInitial);

  useEffect(() => {
    setDisplayedLinks([...initialLinks].sort((a, b) => a.order - b.order));
  }, [initialLinks]);

  const handleDragEnd = useCallback(
    async (result: DropResult) => {
      if (!result.destination) return;
      if (result.source.index === result.destination.index) return;

      const { source, destination } = result;

      const reordered = [...displayedLinks];
      const [removed] = reordered.splice(source.index, 1);
      reordered.splice(destination.index, 0, removed);

      setDisplayedLinks(reordered.map((l, i) => ({ ...l, order: i })));

      const linkIds = reordered.map((l) => l.id);
      try {
        const res = await fetch("/api/user/links/reorder", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ linkIds }),
        });
        if (!res.ok) throw new Error("Failed to reorder");
        onReorder?.();
      } catch {
        setDisplayedLinks([...initialLinks].sort((a, b) => a.order - b.order));
      }
    },
    [displayedLinks, initialLinks, onReorder]
  );

  const reorderByIndex = useCallback(
    async (fromIndex: number, toIndex: number) => {
      if (toIndex < 0 || toIndex >= displayedLinks.length) return;
      if (fromIndex === toIndex) return;

      const reordered = [...displayedLinks];
      const [removed] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, removed);

      setDisplayedLinks(reordered.map((l, i) => ({ ...l, order: i })));

      const linkIds = reordered.map((l) => l.id);
      try {
        const res = await fetch("/api/user/links/reorder", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ linkIds }),
        });
        if (!res.ok) throw new Error("Failed to reorder");
        onReorder?.();
      } catch {
        setDisplayedLinks([...initialLinks].sort((a, b) => a.order - b.order));
      }
    },
    [displayedLinks, initialLinks, onReorder]
  );

  return {
    DragDropContext,
    handleDragEnd,
    reorderByIndex,
    displayedLinks,
  };
}
