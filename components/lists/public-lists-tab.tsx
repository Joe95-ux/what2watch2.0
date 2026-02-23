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
import { ClipboardList, Plus, Grid3x3, Table2, Info } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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

  // Pagination for lists
  const listsTotalPages = Math.ceil(allLists.length / ITEMS_PER_PAGE);
  const paginatedLists = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return allLists.slice(startIndex, endIndex);
  }, [allLists, currentPage]);

  // Pagination for playlists
  const playlistsTotalPages = Math.ceil(allPlaylists.length / ITEMS_PER_PAGE);
  const paginatedPlaylists = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return allPlaylists.slice(startIndex, endIndex);
  }, [allPlaylists, currentPage]);

  return (
    <div className="space-y-6">
      {/* View Toggle and Create Button - Only for authenticated users */}
      {isSignedIn && (
        <div className="flex items-center justify-end gap-2">
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

      {/* Tabs - Popular page style */}
      <Tabs value={activeTab} onValueChange={(v) => {
        setActiveTab(v as TabType);
        setCurrentPage(1);
      }} className="w-full">
        <TabsList>
          <TabsTrigger value="lists" className="cursor-pointer">Lists</TabsTrigger>
          <TabsTrigger value="playlists" className="cursor-pointer">Playlists</TabsTrigger>
        </TabsList>
        
        <TabsContent value="lists" className="mt-6">
          {isLoadingLists ? (
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
          ) : allLists.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg">
              <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No public lists yet</h3>
              <p className="text-muted-foreground mb-4">Be the first to create a public list!</p>
              {isSignedIn ? (
                <Button onClick={() => setIsCreateModalOpen(true)} className="cursor-pointer">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First List
                </Button>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Button asChild className="cursor-pointer">
                    <Link href="/sign-in">Sign In to Create a List</Link>
                  </Button>
                </div>
              )}
            </div>
          ) : viewMode === "grid" ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedLists.map((item) => (
                  <ListCard
                    key={item.id}
                    list={item}
                    variant="grid"
                  />
                ))}
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={listsTotalPages}
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
                    {paginatedLists.map((item) => (
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
              <Pagination
                currentPage={currentPage}
                totalPages={listsTotalPages}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </TabsContent>
        
        <TabsContent value="playlists" className="mt-6">
          {isLoadingPlaylists ? (
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
          ) : allPlaylists.length === 0 ? (
            <div className="text-center py-12 border border-dashed rounded-lg">
              <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No public playlists yet</h3>
              <p className="text-muted-foreground mb-4">Be the first to create a public playlist!</p>
              {isSignedIn ? (
                <Button onClick={() => setIsCreateModalOpen(true)} className="cursor-pointer">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Playlist
                </Button>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <Button asChild className="cursor-pointer">
                    <Link href="/sign-in">Sign In to Create a Playlist</Link>
                  </Button>
                </div>
              )}
            </div>
          ) : viewMode === "grid" ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paginatedPlaylists.map((item) => (
                  <PlaylistCard
                    key={item.id}
                    playlist={item}
                    variant="grid"
                  />
                ))}
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={playlistsTotalPages}
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
                      <th className="text-left p-4 font-semibold">Items</th>
                      <th className="text-left p-4 font-semibold">Creator</th>
                      <th className="text-left p-4 font-semibold">Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPlaylists.map((item) => {
                      const itemCount = (item._count?.items ?? item.items?.length ?? 0) + (item._count?.youtubeItems ?? item.youtubeItems?.length ?? 0);
                      const creatorName = item.user?.username || item.user?.displayName || "Unknown";
                      return (
                        <tr
                          key={item.id}
                          className="border-t hover:bg-muted/50 cursor-pointer"
                          onClick={() => router.push(`/playlists/${item.id}?public=true`)}
                        >
                          <td className="p-4">
                            <div className="font-medium">{item.name}</div>
                            {item.description && (
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {item.description}
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            <span className="text-sm">{itemCount}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-sm">{creatorName}</span>
                          </td>
                          <td className="p-4">
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(item.updatedAt), "MMM d, yyyy")}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={playlistsTotalPages}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Info Dialog */}
      <Dialog open={isInfoDialogOpen} onOpenChange={setIsInfoDialogOpen}>
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

      {isSignedIn && (
        <CreateListModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}
    </div>
  );
}

