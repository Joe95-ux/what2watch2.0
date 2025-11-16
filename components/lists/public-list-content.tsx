"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Share2, Edit2, Trash2, MoreVertical } from "lucide-react";
import MovieCard from "@/components/browse/movie-card";
import ContentDetailModal from "@/components/browse/content-detail-modal";
import { getPosterUrl } from "@/lib/tmdb";
import type { List } from "@/hooks/use-lists";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useDeleteList } from "@/hooks/use-lists";
import { toast } from "sonner";
import { FollowButton } from "@/components/social/follow-button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import Link from "next/link";
import CreateListModal from "./create-list-modal";

type ListWithUser = List & {
  user?: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
};

interface PublicListContentProps {
  listId: string;
}

export default function PublicListContent({ listId }: PublicListContentProps) {
  const router = useRouter();
  const deleteList = useDeleteList();
  const [selectedItem, setSelectedItem] = useState<{ item: TMDBMovie | TMDBSeries; type: "movie" | "tv" } | null>(null);
  const [list, setList] = useState<List | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    const fetchList = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/lists/${listId}`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to load list");
          return;
        }
        const data = await res.json();
        setList(data.list);
        // Get current user ID if authenticated
        try {
          const userRes = await fetch("/api/users/me");
          if (userRes.ok) {
            const userData = await userRes.json();
            setCurrentUserId(userData.user?.id || null);
          }
        } catch {
          // Not authenticated, that's fine
          setCurrentUserId(null);
        }
      } catch (err) {
        setError("Failed to load list");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchList();
  }, [listId]);

  const listWithUser = list as ListWithUser;
  const isOwner = Boolean(currentUserId && list && currentUserId === list.userId);

  // Redirect owner to dashboard list page for better UX
  useEffect(() => {
    if (isOwner && list && !isLoading) {
      router.replace(`/dashboard/lists/${list.id}`);
    }
  }, [isOwner, list, isLoading, router]);

  const handleDelete = async () => {
    if (!list) return;
    try {
      await deleteList.mutateAsync(list.id);
      toast.success("List deleted");
      router.push("/dashboard/lists");
    } catch (error) {
      toast.error("Failed to delete list");
    }
  };

  const handleShare = () => {
    if (navigator.share && list) {
      navigator.share({
        title: list.name,
        text: list.description || `Check out ${list.name} on What2Watch`,
        url: window.location.href,
      }).catch(() => {
        // Fallback to clipboard
        navigator.clipboard.writeText(window.location.href);
        toast.success("Link copied to clipboard");
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !list) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">List not found</h1>
          <p className="text-muted-foreground">{error || "This list doesn't exist or is private."}</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    );
  }

  const user = list.user;
  const displayName = user?.displayName || user?.username || "Unknown";
  const username = user?.username || "unknown";

  // Convert list items to TMDB format for MovieCard
  const items = (list.items || []).map((item) => {
    if (item.mediaType === "movie") {
      return {
        id: item.tmdbId,
        title: item.title,
        poster_path: item.posterPath,
        backdrop_path: item.backdropPath,
        release_date: item.releaseDate || undefined,
      } as TMDBMovie;
    } else {
      return {
        id: item.tmdbId,
        name: item.title,
        poster_path: item.posterPath,
        backdrop_path: item.backdropPath,
        first_air_date: item.firstAirDate || undefined,
      } as TMDBSeries;
    }
  });

  return (
    <>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 space-y-4">
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                    className="flex-shrink-0"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-3xl font-bold truncate">{list.name}</h1>
                    {list.description && (
                      <p className="text-muted-foreground mt-2">{list.description}</p>
                    )}
                  </div>
                </div>

                {/* User Info */}
                <div className="flex items-center gap-3">
                  <Link href={`/users/${user?.id}`}>
                    <Avatar className="h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity">
                      <AvatarImage src={user?.avatarUrl || undefined} />
                      <AvatarFallback>
                        {displayName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/users/${user?.id}`}>
                      <p className="font-medium hover:underline cursor-pointer">{displayName}</p>
                    </Link>
                    {username && (
                      <p className="text-sm text-muted-foreground">@{username}</p>
                    )}
                  </div>
                  {!isOwner && user?.id && (
                    <FollowButton userId={user.id} />
                  )}
                </div>

                {/* Meta Info */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{list.items?.length || 0} films</span>
                  {list.tags && list.tags.length > 0 && (
                    <div className="flex items-center gap-2">
                      {list.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {list.tags.length > 3 && (
                        <span className="text-xs">+{list.tags.length - 3} more</span>
                      )}
                    </div>
                  )}
                  <span>Updated {format(new Date(list.updatedAt), "MMM d, yyyy")}</span>
                  <Badge variant="outline" className="text-xs">
                    {list.visibility === "PUBLIC" ? "Public" : list.visibility === "FOLLOWERS_ONLY" ? "Followers Only" : "Private"}
                  </Badge>
                </div>
              </div>

              {/* Actions */}
              {isOwner && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreVertical className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleShare}>
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setIsEditModalOpen(true)}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => setIsDeleteDialogOpen(true)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {!isOwner && (
                <Button variant="outline" size="icon" onClick={handleShare}>
                  <Share2 className="h-5 w-5" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* List Items */}
        <div className="container mx-auto px-4 py-8">
          {items.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {items.map((item, index) => {
                const isMovie = "title" in item;
                return (
                  <div key={`${item.id}-${index}`} className="relative">
                    {/* Position Badge */}
                    <div className="absolute top-2 left-2 z-10">
                      <Badge className="bg-black/80 text-white font-bold">
                        #{index + 1}
                      </Badge>
                    </div>
                    <MovieCard
                      item={item}
                      type={isMovie ? "movie" : "tv"}
                      variant="default"
                      onCardClick={() => setSelectedItem({ item, type: isMovie ? "movie" : "tv" })}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">This list is empty.</p>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {isOwner && list && (
        <CreateListModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          list={list}
        />
      )}

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete List</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{list.name}&quot;? This action cannot be undone.
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

      {/* Content Detail Modal */}
      {selectedItem && (
        <ContentDetailModal
          item={selectedItem.item}
          type={selectedItem.type}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </>
  );
}

