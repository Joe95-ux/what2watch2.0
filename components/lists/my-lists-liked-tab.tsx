"use client";

import { useState, useMemo } from "react";
import { useLikedLists } from "@/hooks/use-list-likes";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import ListCard from "@/components/browse/list-card";
import { Heart, Grid3x3, Table2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import type { List } from "@/hooks/use-lists";

const ITEMS_PER_PAGE = 24;

export default function MyListsLikedTab() {
  const { data: likedLists = [], isLoading } = useLikedLists();
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  // Pagination
  const totalPages = Math.ceil(likedLists.length / ITEMS_PER_PAGE);
  const paginatedLists = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return likedLists.slice(startIndex, endIndex);
  }, [likedLists, currentPage]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Liked Lists</h2>
          <p className="text-muted-foreground mt-1">
            Lists you&apos;ve liked from other users
          </p>
        </div>
        <div className="flex items-center gap-1 border rounded-lg p-1">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="h-8 cursor-pointer"
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "ghost"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="h-8 cursor-pointer"
          >
            <Table2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
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
      ) : likedLists.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <Heart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No liked lists yet</h3>
          <p className="text-muted-foreground">
            Like lists from other users to see them here
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedLists.map((list: List) => (
              <ListCard
                key={list.id}
                list={list}
                variant="grid"
              />
            ))}
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="cursor-pointer"
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="cursor-pointer"
              >
                Next
              </Button>
            </div>
          )}
        </>
      ) : (
        <>
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
                {paginatedLists.map((list: List) => (
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
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="cursor-pointer"
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="cursor-pointer"
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

