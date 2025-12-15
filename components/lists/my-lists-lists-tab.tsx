"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLists, useDeleteList, type List } from "@/hooks/use-lists";
import { usePlaylists, useDeletePlaylist, type Playlist } from "@/hooks/use-playlists";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus, List as ListIcon, Grid3x3, Table2, Trash2, Edit, Music } from "lucide-react";
import CreateListModal from "./create-list-modal";
import CreatePlaylistModal from "@/components/playlists/create-playlist-modal";
import ListCard from "@/components/browse/list-card";
import PlaylistCard from "@/components/browse/playlist-card";
import { toast } from "sonner";
import { format } from "date-fns";
import Link from "next/link";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SimplePagination as Pagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

const ITEMS_PER_PAGE = 24;

type TabType = "lists" | "playlists";

export default function MyListsListsTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: lists = [], isLoading: isLoadingLists } = useLists();
  const { data: playlists = [], isLoading: isLoadingPlaylists } = usePlaylists();
  const deleteList = useDeleteList();
  const deletePlaylist = useDeletePlaylist();
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [isCreateListModalOpen, setIsCreateListModalOpen] = useState(false);
  const [isCreatePlaylistModalOpen, setIsCreatePlaylistModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<List | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{ type: "list" | "playlist"; item: List | Playlist } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const tab = searchParams.get("type");
    return (tab === "playlists") ? "playlists" : "lists";
  });

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
  }, [activeTab, router, searchParams]);

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
  const currentItems = activeTab === "lists" ? lists : playlists;
  const isLoading = activeTab === "lists" ? isLoadingLists : isLoadingPlaylists;

  // Pagination
  const totalPages = Math.ceil(currentItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return currentItems.slice(startIndex, endIndex);
  }, [currentItems, currentPage]);

  const handleDelete = async () => {
    if (!itemToDelete) return;
    
    try {
      if (itemToDelete.type === "list") {
        await deleteList.mutateAsync((itemToDelete.item as List).id);
        toast.success("List deleted");
      } else {
        await deletePlaylist.mutateAsync((itemToDelete.item as Playlist).id);
        toast.success("Playlist deleted");
      }
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    } catch {
      toast.error(`Failed to delete ${itemToDelete.type}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Tabs - Desktop: same row, Mobile: toggle/CTA above tabs */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        {/* Tabs - Desktop: left side, Mobile: below toggle/CTA */}
        <div className="border-b border-border max-w-fit sm:border-b-0 sm:border-0 order-2 sm:order-1">
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
              Curated Lists
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
          </div>
        </div>

        {/* View Toggle and CTA - Desktop: right side, Mobile: above tabs */}
        <div className="flex items-center gap-2 order-1 sm:order-2">
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
          <Button onClick={() => {
            if (activeTab === "lists") {
              setEditingList(undefined);
              setIsCreateListModalOpen(true);
            } else {
              setIsCreatePlaylistModalOpen(true);
            }
          }} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            Create {activeTab === "lists" ? "List" : "Playlist"}
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
      ) : currentItems.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          {activeTab === "lists" ? (
            <>
              <ListIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold tracking-tight mb-2">My Lists</h2>
              <p className="text-muted-foreground mb-4">
                Create and manage your ranked lists of favorite films
              </p>
              <Button onClick={() => setIsCreateListModalOpen(true)} className="cursor-pointer">
                <Plus className="h-4 w-4 mr-2" />
                Create List
              </Button>
            </>
          ) : (
            <>
              <Music className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold tracking-tight mb-2">My Playlists</h2>
              <p className="text-muted-foreground mb-4">
                Create and manage your playlists of movies, TV shows, and YouTube videos
              </p>
              <Button onClick={() => setIsCreatePlaylistModalOpen(true)} className="cursor-pointer">
                <Plus className="h-4 w-4 mr-2" />
                Create Playlist
              </Button>
            </>
          )}
        </div>
      ) : activeTab === "lists" ? (
        viewMode === "grid" ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(paginatedItems as List[]).map((list) => {
                return (
                  <div
                    key={list.id}
                    className="group relative"
                  >
                    <ListCard
                      list={list}
                      variant="grid"
                      className="cursor-pointer"
                    />
                    {/* Action Buttons - Overlay on hover */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-20">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm border-0 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingList(list);
                          setIsCreateListModalOpen(true);
                        }}
                      >
                        <Edit className="h-3 w-3 text-white" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm border-0 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemToDelete({ type: "list", item: list });
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-white" />
                      </Button>
                    </div>
                  </div>
                );
              })}
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
                    <th className="text-left p-4 font-semibold">Visibility</th>
                    <th className="text-left p-4 font-semibold">Updated</th>
                    <th className="text-right p-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(paginatedItems as List[]).map((list) => (
                    <tr key={list.id} className="border-t hover:bg-muted/50">
                      <td className="p-4">
                        <Link href={`/dashboard/lists/${list.id}`} className="hover:underline">
                          <div className="font-medium">{list.name}</div>
                          {list.description && (
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {list.description}
                            </div>
                          )}
                        </Link>
                      </td>
                      <td className="p-4">
                        <span className="text-sm">{list.items.length}</span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm capitalize">
                          {list.visibility.toLowerCase().replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(list.updatedAt), "MMM d, yyyy")}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingList(list);
                              setIsCreateListModalOpen(true);
                            }}
                            className="cursor-pointer"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setItemToDelete({ type: "list", item: list });
                              setDeleteDialogOpen(true);
                            }}
                            className="text-destructive hover:text-destructive cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
            {(paginatedItems as Playlist[]).map((playlist) => (
              <PlaylistCard
                key={playlist.id}
                playlist={playlist}
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

      <CreateListModal
        isOpen={isCreateListModalOpen}
        onClose={() => {
          setIsCreateListModalOpen(false);
          setEditingList(undefined);
        }}
        list={editingList}
      />

      <CreatePlaylistModal
        isOpen={isCreatePlaylistModalOpen}
        onClose={() => setIsCreatePlaylistModalOpen(false)}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {itemToDelete?.type === "list" ? "List" : "Playlist"}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{itemToDelete?.item.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground cursor-pointer">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

