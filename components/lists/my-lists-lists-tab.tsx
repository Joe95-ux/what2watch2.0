"use client";

import { useState, useMemo } from "react";
import { useLists, useDeleteList, type List } from "@/hooks/use-lists";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus, List as ListIcon, Grid3x3, Table2, Trash2, Edit } from "lucide-react";
import CreateListModal from "./create-list-modal";
import ListCard from "@/components/browse/list-card";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
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
import { Pagination } from "@/components/ui/pagination";

const ITEMS_PER_PAGE = 24;

export default function MyListsListsTab() {
  const router = useRouter();
  const { data: lists = [], isLoading } = useLists();
  const deleteList = useDeleteList();
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingList, setEditingList] = useState<List | undefined>();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [listToDelete, setListToDelete] = useState<List | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Pagination
  const totalPages = Math.ceil(lists.length / ITEMS_PER_PAGE);
  const paginatedLists = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return lists.slice(startIndex, endIndex);
  }, [lists, currentPage]);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">My Lists</h2>
          <p className="text-muted-foreground mt-1">
            Create and manage your ranked lists of favorite films
          </p>
        </div>
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
          <Button onClick={() => {
            setEditingList(undefined);
            setIsCreateModalOpen(true);
          }} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            Create List
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
      ) : lists.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg">
          <ListIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No lists yet</h3>
          <p className="text-muted-foreground mb-4">
            Create your first list to organize your favorite films
          </p>
          <Button onClick={() => setIsCreateModalOpen(true)} className="cursor-pointer">
            <Plus className="h-4 w-4 mr-2" />
            Create List
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paginatedLists.map((list) => {
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
                {paginatedLists.map((list) => (
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
                          className="cursor-pointer"
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
      )}

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
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground cursor-pointer">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

