"use client";

import { useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useCurrentUser } from "@/hooks/use-current-user";
import { Button } from "@/components/ui/button";
import WatchlistView from "./watchlist-view";

interface PublicWatchlistContentProps {
  userId: string;
}

export default function PublicWatchlistContent({ userId }: PublicWatchlistContentProps) {
  const router = useRouter();
  const { data: currentUser } = useCurrentUser();
  const isOwner = currentUser?.id === userId;

  // Fetch public watchlist
  const { data: watchlistData, isLoading } = useQuery({
    queryKey: ["public-watchlist", userId],
    queryFn: async () => {
      const response = await fetch(`/api/watchlist/public?userId=${userId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch watchlist");
      }
      return response.json();
    },
    enabled: !!userId,
  });

  const watchlist = useMemo(() => watchlistData?.watchlist || [], [watchlistData?.watchlist]);
  const user = watchlistData?.user;

  // Redirect owner to dashboard watchlist page
  useEffect(() => {
    if (isOwner && watchlistData && !isLoading) {
      router.replace("/dashboard/watchlist");
    }
  }, [isOwner, watchlistData, isLoading, router]);

  const shareUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/users/${userId}/watchlist` 
    : "";

  return (
    <WatchlistView
      watchlist={watchlist}
      isLoading={isLoading}
      user={user}
      isOwner={isOwner}
      enableRemove={false}
      enableEdit={false}
      enableExport={false}
      enableCreateList={false}
      enablePublicToggle={false}
      shareUrl={shareUrl}
      emptyTitle="This watchlist is empty"
      emptyDescription="No items have been added yet."
      errorTitle="Watchlist not found"
      errorDescription="This watchlist doesn't exist or is private."
      errorAction={
        <Button onClick={() => router.push("/browse")} className="cursor-pointer">
          Browse Content
        </Button>
      }
    />
  );
}
