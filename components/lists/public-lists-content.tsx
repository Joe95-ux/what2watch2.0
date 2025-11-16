"use client";

import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import ListCard from "@/components/browse/list-card";
import { List } from "@/hooks/use-lists";
import { ClipboardList } from "lucide-react";

// Fetch public lists (no authentication required)
const fetchPublicLists = async (limit?: number): Promise<List[]> => {
  const url = limit ? `/api/lists/public?limit=${limit}` : "/api/lists/public";
  const res = await fetch(url, {
    credentials: 'omit',
    cache: 'no-store',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Failed to fetch public lists: ${res.status}`);
  }
  const data = await res.json();
  return data.lists || [];
};

export function usePublicLists(limit?: number) {
  return useQuery<List[]>({
    queryKey: ["public-lists", limit],
    queryFn: () => fetchPublicLists(limit),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export default function PublicListsContent() {
  const { data: lists = [], isLoading } = usePublicLists(50);

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Discover Lists</h1>
        <p className="text-muted-foreground">
          Explore curated lists of films from the community
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-lg" />
          ))}
        </div>
      ) : lists.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No public lists yet</h3>
          <p className="text-muted-foreground">
            Be the first to create a public list!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {lists.map((list: List) => (
            <ListCard
              key={list.id}
              list={list}
              variant="grid"
            />
          ))}
        </div>
      )}
    </div>
  );
}

