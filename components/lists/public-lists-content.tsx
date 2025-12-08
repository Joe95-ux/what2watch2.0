"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import ListCard from "@/components/browse/list-card";
import { List } from "@/hooks/use-lists";
import { ClipboardList, Plus, Grid3x3, Table2 } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";
import CreateListModal from "./create-list-modal";
import { format } from "date-fns";

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
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Refetch when component mounts to ensure fresh data
  useEffect(() => {
    refetch();
  }, [refetch]);

  return (
    <div className="container max-w-[1400px] mx-auto px-4 py-8">
      <div className="flex-1 min-w-0">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-2">Discover Lists</h1>
              <p className="text-muted-foreground">
                Explore curated lists of films from the community
              </p>
            </div>
            {isSignedIn && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 border rounded-lg p-1">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                    className="h-8"
                  >
                    <Grid3x3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "table" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("table")}
                    className="h-8"
                  >
                    <Table2 className="h-4 w-4" />
                  </Button>
                </div>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create List
                </Button>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className={viewMode === "grid" ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className={viewMode === "grid" ? "space-y-2" : ""}>
                  <Skeleton className={viewMode === "grid" ? "w-full max-h-[225px] h-[225px] rounded-lg" : "h-24"} />
                  {viewMode === "grid" && (
                    <>
                      <Skeleton className="h-5 w-3/4 rounded" />
                      <Skeleton className="h-4 w-1/2 rounded" />
                    </>
                  )}
                </div>
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
                <Button onClick={() => setIsCreateModalOpen(true)} className="cursor-pointer">
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
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {lists.map((list: List) => (
                <ListCard
                  key={list.id}
                  list={list}
                  variant="grid"
                />
              ))}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-4 font-semibold">Name</th>
                    <th className="text-left p-4 font-semibold">Films</th>
                    <th className="text-left p-4 font-semibold">Creator</th>
                    <th className="text-left p-4 font-semibold">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {lists.map((list) => (
                    <tr key={list.id} className="border-t hover:bg-muted/50 cursor-pointer" onClick={() => router.push(`/lists/${list.id}`)}>
                      <td className="p-4">
                        <div className="font-medium">{list.name}</div>
                        {list.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {list.description}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="text-sm">{list._count?.items || list.items?.length || 0}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm">
                          {list.user?.displayName || list.user?.username || "Unknown"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(list.updatedAt), "MMM d, yyyy")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {isSignedIn && (
        <CreateListModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}
    </div>
  );
}

