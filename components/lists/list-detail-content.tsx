"use client";

import { useList } from "@/hooks/use-lists";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Trash2, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getPosterUrl } from "@/lib/tmdb";
import { format } from "date-fns";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useCurrentUser } from "@/hooks/use-current-user";
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
import { useState } from "react";
import { useDeleteList } from "@/hooks/use-lists";
import { toast } from "sonner";
import CreateListModal from "./create-list-modal";

interface ListDetailContentProps {
  listId: string;
}

export default function ListDetailContent({ listId }: ListDetailContentProps) {
  const { data: list, isLoading } = useList(listId);
  const { data: currentUser } = useCurrentUser();
  const deleteList = useDeleteList();
  const router = useRouter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const isOwner = currentUser?.id === list?.userId;

  const handleDelete = async () => {
    try {
      await deleteList.mutateAsync(listId);
      toast.success("List deleted");
      router.push("/dashboard/lists");
    } catch (error) {
      toast.error("Failed to delete list");
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="container max-w-7xl mx-auto">
          <Skeleton className="h-8 w-64 mb-4" />
          <Skeleton className="h-32 w-full mb-6" />
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3]" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!list) {
    return (
      <div className="flex-1 space-y-6 p-6">
        <div className="container max-w-7xl mx-auto">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold mb-2">List not found</h2>
            <p className="text-muted-foreground mb-4">
              This list doesn&apos;t exist or you don&apos;t have permission to view it.
            </p>
            <Button onClick={() => router.push("/dashboard/lists")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Lists
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      <div className="container max-w-7xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => router.push("/dashboard/lists")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2"/>
          Back to Lists
        </Button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold tracking-tight mb-2">{list.name}</h1>
              {list.description && (
                <p className="text-lg text-muted-foreground mb-4">{list.description}</p>
              )}
              
              {/* User Info */}
              <div className="flex items-center gap-3 mb-4">
                <Link href={`/${list.user.username || list.user.id}`}>
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={list.user.avatarUrl || undefined} />
                    <AvatarFallback>
                      {(list.user.displayName || list.user.username || "U")[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div>
                  <Link
                    href={`/${list.user.username || list.user.id}`}
                    className="font-semibold hover:underline"
                  >
                    {list.user.displayName || list.user.username}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    Updated {format(new Date(list.updatedAt), "MMM d, yyyy")}
                  </p>
                </div>
              </div>

              {/* Tags and Metadata */}
              <div className="flex items-center gap-4 flex-wrap">
                {list.tags.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {list.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
                <span className="text-sm text-muted-foreground">
                  {list.items.length} {list.items.length === 1 ? "film" : "films"}
                </span>
                <span className="text-sm text-muted-foreground capitalize">
                  {list.visibility.toLowerCase().replace("_", " ")}
                </span>
              </div>
            </div>

            {/* Actions */}
            {isOwner && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditModalOpen(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Films Grid */}
        {list.items.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-lg">
            <p className="text-muted-foreground">This list is empty</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {list.items.map((item, index) => (
              <Link
                key={item.id}
                href={`/browse/${item.mediaType}/${item.tmdbId}`}
                className="group relative"
              >
                <div className="relative aspect-[2/3] rounded-lg overflow-hidden border bg-muted">
                  {item.posterPath ? (
                    <Image
                      src={getPosterUrl(item.posterPath)}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      unoptimized
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-4xl font-bold text-muted-foreground">
                        #{item.position}
                      </span>
                    </div>
                  )}
                  
                  {/* Position Badge */}
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-black/70 text-white font-bold">
                      #{item.position}
                    </Badge>
                  </div>
                </div>
                <div className="mt-2">
                  <p className="text-sm font-medium line-clamp-2 group-hover:underline">
                    {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize mt-1">
                    {item.mediaType}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {isOwner && (
        <>
          <CreateListModal
            isOpen={isEditModalOpen}
            onClose={() => setIsEditModalOpen(false)}
            list={list}
          />

          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete List</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;{list.name}&quot;? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  );
}

