"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import ListCard from "@/components/browse/list-card";
import { List } from "@/hooks/use-lists";
import { ClipboardList, Plus } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Fetch public lists (no authentication required)
const fetchPublicLists = async (limit?: number): Promise<List[]> => {
  const url = limit ? `/api/lists/public?limit=${limit}` : "/api/lists/public";
  const res = await fetch(url, {
    credentials: 'include',
    cache: 'no-store',
    headers: {
      'Cache-Control': 'no-cache',
    },
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
    staleTime: 0, // Always refetch when invalidated
    gcTime: 1000 * 60 * 5, // Keep in cache for 5 minutes
    refetchOnMount: true, // Always refetch on mount
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });
}

export default function PublicListsContent() {
  const { data: lists = [], isLoading, refetch } = usePublicLists(50);
  const { isSignedIn } = useUser();
  const router = useRouter();

  // Refetch when component mounts to ensure fresh data
  useEffect(() => {
    refetch();
  }, [refetch]);

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Discover Lists</h1>
        <p className="text-muted-foreground">
          Explore curated lists of films from the community
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[3/4] w-full rounded-lg" />
          ))}
        </div>
      ) : lists.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No public lists yet</h3>
          <p className="text-muted-foreground mb-4">
            Be the first to create a public list!
          </p>
          {isSignedIn ? (
            <Button onClick={() => router.push("/dashboard/lists")} className="cursor-pointer">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First List
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <Button asChild className="cursor-pointer">
                <Link href="/sign-in">
                  Sign In to Create a List
                </Link>
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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

