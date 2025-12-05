"use client";

import { useWatchlist, useRemoveFromWatchlist, useWatchlistPublicStatus, useUpdateWatchlistPublicStatus } from "@/hooks/use-watchlist";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import WatchlistView from "./watchlist-view";

export default function WatchlistContent() {
  const { data: watchlist = [], isLoading } = useWatchlist();
  const removeFromWatchlist = useRemoveFromWatchlist();
  const { data: currentUser } = useCurrentUser();
  const { data: isPublic = true } = useWatchlistPublicStatus();
  const updatePublicStatus = useUpdateWatchlistPublicStatus();
  const router = useRouter();

  const shareUrl = typeof window !== "undefined" && currentUser
    ? `${window.location.origin}/users/${currentUser.id}/watchlist` 
    : "";

  const handleRemove = async (tmdbId: number, mediaType: "movie" | "tv") => {
    await removeFromWatchlist.mutateAsync({ tmdbId, mediaType });
  };

  const handleTogglePublic = async (checked: boolean) => {
    await updatePublicStatus.mutateAsync(checked);
  };

  return (
    <WatchlistView
      watchlist={watchlist}
      isLoading={isLoading}
      isOwner={true}
      enableRemove={true}
      enableEdit={true}
      enableExport={true}
      enableCreateList={true}
      enablePublicToggle={true}
      isPublic={isPublic}
      onTogglePublic={handleTogglePublic}
      onRemove={handleRemove}
      shareUrl={shareUrl}
      emptyTitle="Your watchlist is empty"
      emptyDescription="Start adding movies and TV shows you want to watch."
      emptyAction={
        <Button onClick={() => router.push("/browse")} className="cursor-pointer">
          Browse Content
        </Button>
      }
    />
  );
}
