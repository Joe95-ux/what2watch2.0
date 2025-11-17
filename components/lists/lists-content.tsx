"use client";

import { useState } from "react";
import { useLists, useDeleteList, type List } from "@/hooks/use-lists";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus, List as ListIcon, Grid3x3, Table2, Trash2, Edit, Heart, MessageCircle } from "lucide-react";
import CreateListModal from "./create-list-modal";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getPosterUrl } from "@/lib/tmdb";
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

export default function ListsContent() {
  const router = useRouter();
  const { data: lists = [], isLoading } = useLists();
  const deleteList = useDeleteList();
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<List | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [listToDelete, setListToDelete] = useState<List | null>(null);

  const handleDelete = async () => {
    if (!listToDelete) return;
    
    try {
      await deleteList.mutateAsync(listToDelete.id);
      toast.success("List deleted");
      setDeleteDialogOpen(false);
      setListToDelete(null);
    } catch {
      toast.error("Failed to delete list");
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="container max-w-7xl mx-auto">
        <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0 mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Curated Lists</h1>
            <p className="text-muted-foreground mt-2">
              Create and manage your ranked lists of favorite films
            </p>
          </div>
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
            <Button onClick={() => {
              setEditingList(undefined);
              setIsCreateModalOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Create List
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" : "space-y-4"}>
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className={viewMode === "grid" ? "aspect-[3/4] w-full rounded-lg" : "h-24"} />
            ))}
          </div>
        ) : lists.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-lg">
            <ListIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No lists yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first list to organize your favorite films
            </p>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create List
            </Button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {lists.map((list) => {
              const coverImage = list.items.length > 0 && list.items[0].posterPath 
                ? getPosterUrl(list.items[0].posterPath) 
                : null;
              const displayName = list.user?.displayName || list.user?.username || "Unknown";
              const likeCount = list._count?.likedBy || 0;
              const commentCount = list._count?.comments || 0;
              
              return (
                <div
                  key={list.id}
                  className="group relative cursor-pointer"
                  onClick={() => router.push(`/dashboard/lists/${list.id}`)}
                >
                  <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden bg-muted border border-border hover:border-primary/50 transition-colors">
                    {/* Cover Image */}
                    {coverImage ? (
                      <Image
                        src={coverImage}
                        alt={list.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 180px, 200px"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50">
                        <ListIcon className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}

                    {/* Action Buttons - Top Right */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-sm border-0 cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingList(list);
                          setIsCreateModalOpen(true);
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
                          setListToDelete(list);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-3 w-3 text-white" />
                      </Button>
                    </div>

                    {/* Tags - Bottom Left */}
                    {list.tags.length > 0 && (
                      <div className="absolute bottom-2 left-2 flex flex-wrap gap-1 max-w-[70%] opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        {list.tags.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="text-xs px-2 py-0.5 bg-black/60 backdrop-blur-sm text-white rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {list.tags.length > 2 && (
                          <span className="text-xs px-2 py-0.5 bg-black/60 backdrop-blur-sm text-white rounded">
                            +{list.tags.length - 2}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Title and Meta Info Below Card */}
                  <div className="mt-2">
                    <h3 className="text-[16px] font-semibold line-clamp-1 mb-1">{list.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span>{displayName}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {likeCount}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" />
                        {commentCount}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
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
                {lists.map((list) => (
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
                            setIsCreateModalOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setListToDelete(list);
                            setDeleteDialogOpen(true);
                          }}
                          className="text-destructive hover:text-destructive"
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
        )}
      </div>

      <CreateListModal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setEditingList(undefined);
        }}
        list={editingList}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete List</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{listToDelete?.name}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

