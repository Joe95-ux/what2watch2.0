"use client";

import { usePublicLists } from "./public-lists-content";
import { usePublicPlaylists } from "@/hooks/use-playlists";
import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import ListCard from "@/components/browse/list-card";
import PlaylistCard from "@/components/browse/playlist-card";
import { List } from "@/hooks/use-lists";
import { Playlist } from "@/hooks/use-playlists";
import { ClipboardList, Plus, Grid3x3, Table2, List as ListIcon, Music, Info } from "lucide-react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import CreateListModal from "./create-list-modal";
import { format } from "date-fns";
import { SimplePagination as Pagination } from "@/components/ui/pagination";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 24;

type TabType = "lists" | "playlists";

export default function PublicListsTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: allLists = [], isLoading: isLoadingLists } = usePublicLists();
  const { data: allPlaylists = [], isLoading: isLoadingPlaylists } = usePublicPlaylists();
  const { isSignedIn } = useUser();
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const tab = searchParams.get("type");
    return (tab === "playlists") ? "playlists" : "lists";
  });
  const [isInfoDialogOpen, setIsInfoDialogOpen] = useState(false);

  // Update URL when tab changes
  useEffect(() => {
    const currentType = searchParams.get("type");
    const expectedType = activeTab === "lists" ? null : activeTab;
    
    if (currentType !== expectedType) {
      const params = new URLSearchParams(searchParams.toString());
      if (activeTab === "lists") {
        params.delete("type");
      } else {
        params.set("type", activeTab);
      }
      const newUrl = params.toString() ? `/lists?${params.toString()}` : "/lists";
      router.push(newUrl);
    }
  }, [activeTab, router]);

  // Sync with URL changes (browser back/forward)
  useEffect(() => {
    const type = searchParams.get("type");
    if (type === "playlists") {
      setActiveTab("playlists");
    } else {
      setActiveTab("lists");
    }
  }, [searchParams]);

  // Get current items based on active tab
  const currentItems = activeTab === "lists" ? allLists : allPlaylists;
  const isLoading = activeTab === "lists" ? isLoadingLists : isLoadingPlaylists;

  // Pagination
  const totalPages = Math.ceil(currentItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return currentItems.slice(startIndex, endIndex);
  }, [currentItems, currentPage]) as List[] | Playlist[];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <p className="text-muted-foreground">
            Explore curated lists of movies and TV shows from the community
          </p>
        </div>
        {isSignedIn && (
          <div className="flex items-center gap-2">
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
            <Button onClick={() => setIsCreateModalOpen(true)} className="cursor-pointer">
              <Plus className="h-4 w-4 mr-2" />
              Create List
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-border max-w-fit">
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => {
              setActiveTab("lists");
              setCurrentPage(1);
            }}
            className={cn(
              "relative py-3 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2",
              activeTab === "lists"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ListIcon className="h-4 w-4" />
            Lists
            {activeTab === "lists" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab("playlists");
              setCurrentPage(1);
            }}
            className={cn(
              "relative py-3 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2",
              activeTab === "playlists"
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Music className="h-4 w-4" />
            Playlists
            {activeTab === "playlists" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
          <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
            <DialogTrigger asChild>
              <button
                className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-1"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsInfoDialogOpen(true);
                }}
              >
                <Info className="h-4 w-4" />
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Lists vs Playlists</DialogTitle>
                <DialogDescription className="space-y-4 pt-4">
                  <div>
                    <h4 className="font-semibold mb-2">Lists</h4>
                    <p className="text-sm text-muted-foreground">
                      Lists are ranked collections of movies and TV shows. They allow you to organize content in a specific order, making them perfect for creating top 10 lists, favorites rankings, or any curated collection where order matters.
                    </p>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Playlists</h4>
                    <p className="text-sm text-muted-foreground">
                      Playlists are flexible collections that can include both movies/TV shows and YouTube videos. They don&apos;t require ranking and are great for organizing content you want to watch later or share with others.
                    </p>
                  </div>
                </DialogDescription>
              </DialogHeader>
            </DialogContent>
          </Dialog>
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
      ) : currentItems.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            No public {activeTab === "lists" ? "lists" : "playlists"} yet
          </h3>
          <p className="text-muted-foreground mb-4">
            Be the first to create a public {activeTab === "lists" ? "list" : "playlist"}!
          </p>
          {isSignedIn ? (
            <Button onClick={() => setIsCreateModalOpen(true)} className="cursor-pointer">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First {activeTab === "lists" ? "List" : "Playlist"}
            </Button>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <Button asChild className="cursor-pointer">
                <Link href="/sign-in">
                  Sign In to Create a {activeTab === "lists" ? "List" : "Playlist"}
                </Link>
              </Button>
            </div>
          )}
        </div>
      ) : activeTab === "lists" ? (
        viewMode === "grid" ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(paginatedItems as List[]).map((item) => (
                <ListCard
                  key={item.id}
                  list={item}
                  variant="grid"
                />
              ))}
            </div>
            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
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
                  {(paginatedItems as List[]).map((item) => (
                    <tr key={item.id} className="border-t hover:bg-muted/50 cursor-pointer" onClick={() => router.push(`/lists/${item.id}`)}>
                      <td className="p-4">
                        <div className="font-medium">{item.name}</div>
                        {item.description && (
                          <div className="text-sm text-muted-foreground line-clamp-1">
                            {item.description}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="text-sm">{item._count?.items || item.items?.length || 0}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm">
                          {item.user?.username || item.user?.displayName || "Unknown"}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(item.updatedAt), "MMM d, yyyy")}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )
      ) : (
        // Playlists view
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(paginatedItems as Playlist[]).map((item) => (
              <PlaylistCard
                key={item.id}
                playlist={item}
                variant="grid"
              />
            ))}
          </div>
          {/* Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}

      {isSignedIn && (
        <CreateListModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}
    </div>
  );
}

