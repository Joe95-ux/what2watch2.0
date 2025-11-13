"use client";

import { useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useFavorites } from "@/hooks/use-favorites";
import { usePlaylists } from "@/hooks/use-playlists";
import { useRecentlyViewed, recentlyViewedToTMDBItem } from "@/hooks/use-recently-viewed";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import ContentRow from "@/components/browse/content-row";
import PlaylistCard from "@/components/browse/playlist-card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Heart, Clock, Film } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function DashboardContent() {
  const { user } = useUser();
  const { data: favorites = [], isLoading: isLoadingFavorites } = useFavorites();
  const { data: playlists = [], isLoading: isLoadingPlaylists } = usePlaylists();
  const { data: recentlyViewed = [], isLoading: isLoadingRecentlyViewed } = useRecentlyViewed();

  // Convert recently viewed to TMDB format
  const recentlyViewedItems = useMemo(() => {
    return recentlyViewed.slice(0, 10).map(recentlyViewedToTMDBItem);
  }, [recentlyViewed]);

  // Convert favorites to TMDB format
  const favoriteItems = useMemo(() => {
    return favorites.slice(0, 10).map((fav) => {
      const baseItem = {
        id: fav.tmdbId,
        poster_path: fav.posterPath,
        backdrop_path: fav.backdropPath,
        vote_average: 0,
        vote_count: 0,
        popularity: 0,
        genre_ids: [],
        original_language: "en",
      };

      if (fav.mediaType === "movie") {
        return {
          ...baseItem,
          title: fav.title,
          release_date: fav.releaseDate || "",
          adult: false,
          original_title: fav.title,
          overview: "",
        } as TMDBMovie;
      } else {
        return {
          ...baseItem,
          name: fav.title,
          first_air_date: fav.firstAirDate || "",
          original_name: fav.title,
          overview: "",
        } as TMDBSeries;
      }
    });
  }, [favorites]);

  // Calculate stats
  const stats = useMemo(() => {
    return {
      watchlistCount: favorites.length,
      playlistCount: playlists.length,
      recentlyViewedCount: recentlyViewed.length,
      totalItems: favorites.length + playlists.reduce((acc, p) => acc + (p._count?.items || 0), 0),
    };
  }, [favorites, playlists, recentlyViewed]);

  const displayName = user?.fullName || user?.firstName || "User";
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Greeting */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            {greeting}, {displayName}
          </h1>
          <p className="text-muted-foreground">
            Here&apos;s what&apos;s happening with your watchlist
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={Heart}
            label="Watchlist"
            value={stats.watchlistCount}
            isLoading={isLoadingFavorites}
            href="/my-list"
          />
          <StatCard
            icon={BookOpen}
            label="Playlists"
            value={stats.playlistCount}
            isLoading={isLoadingPlaylists}
            href="/playlists"
          />
          <StatCard
            icon={Clock}
            label="Recently Viewed"
            value={stats.recentlyViewedCount}
            isLoading={isLoadingRecentlyViewed}
          />
          <StatCard
            icon={Film}
            label="Total Items"
            value={stats.totalItems}
            isLoading={isLoadingFavorites || isLoadingPlaylists}
          />
        </div>

        {/* Continue Watching Section */}
        {isLoadingRecentlyViewed ? (
          <div className="mb-12">
            <Skeleton className="h-7 w-48 mb-6 !bg-gray-200 dark:!bg-accent" />
            <div className="flex gap-4 overflow-x-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[2/3] w-[200px] flex-shrink-0 rounded-lg !bg-gray-200 dark:!bg-accent" />
              ))}
            </div>
          </div>
        ) : recentlyViewedItems.length > 0 ? (
          <div className="mb-12">
            <ContentRow
              title="Continue Watching"
              items={recentlyViewedItems}
              type={recentlyViewedItems.length > 0 ? ("title" in recentlyViewedItems[0] ? "movie" : "tv") : "movie"}
            />
          </div>
        ) : null}

        {/* My Watchlist Section */}
        {isLoadingFavorites ? (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-7 w-48 !bg-gray-200 dark:!bg-accent" />
              <Skeleton className="h-4 w-24 !bg-gray-200 dark:!bg-accent" />
            </div>
            <div className="flex gap-4 overflow-x-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[2/3] w-[200px] flex-shrink-0 rounded-lg !bg-gray-200 dark:!bg-accent" />
              ))}
            </div>
          </div>
        ) : favoriteItems.length > 0 ? (
          <div className="mb-12">
            <ContentRow
              title="My Watchlist"
              items={favoriteItems}
              type={favoriteItems.length > 0 ? ("title" in favoriteItems[0] ? "movie" : "tv") : "movie"}
              href="/my-list"
            />
          </div>
        ) : (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">My Watchlist</h2>
              <Link href="/browse" className="text-sm text-muted-foreground hover:text-foreground">
                Browse →
              </Link>
            </div>
            <div className="text-center py-12 border border-dashed rounded-lg">
              <p className="text-muted-foreground mb-4">Your watchlist is empty</p>
              <Link href="/browse">
                <span className="text-sm text-primary hover:underline">Start adding content</span>
              </Link>
            </div>
          </div>
        )}

        {/* My Playlists Section */}
        {isLoadingPlaylists ? (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-7 w-48 !bg-gray-200 dark:!bg-accent" />
              <Skeleton className="h-4 w-24 !bg-gray-200 dark:!bg-accent" />
            </div>
            <div className="flex gap-4 overflow-x-hidden">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="aspect-[3/4] w-[200px] flex-shrink-0 rounded-lg !bg-gray-200 dark:!bg-accent" />
              ))}
            </div>
          </div>
        ) : playlists.length > 0 ? (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">My Playlists</h2>
              <Link href="/playlists" className="text-sm text-muted-foreground hover:text-foreground">
                View all →
              </Link>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {playlists.slice(0, 10).map((playlist) => (
                <PlaylistCard key={playlist.id} playlist={playlist} />
              ))}
            </div>
          </div>
        ) : (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">My Playlists</h2>
              <Link href="/playlists" className="text-sm text-muted-foreground hover:text-foreground">
                Create one →
              </Link>
            </div>
            <div className="text-center py-12 border border-dashed rounded-lg">
              <p className="text-muted-foreground mb-4">You haven&apos;t created any playlists yet</p>
              <Link href="/playlists">
                <span className="text-sm text-primary hover:underline">Create your first playlist</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  isLoading?: boolean;
  href?: string;
}

function StatCard({ icon: Icon, label, value, isLoading, href }: StatCardProps) {
  const content = (
    <div className={cn(
      "bg-card border rounded-lg p-4 sm:p-6 transition-colors",
      href && "hover:bg-accent/50 cursor-pointer"
    )}>
      <div className="flex items-center justify-between mb-2">
        <Icon className="h-5 w-5 text-muted-foreground" />
        {href && (
          <span className="text-xs text-muted-foreground">View →</span>
        )}
      </div>
      {isLoading ? (
        <Skeleton className="h-8 w-16 !bg-gray-200 dark:!bg-accent" />
      ) : (
        <div className="text-2xl sm:text-3xl font-bold">{value}</div>
      )}
      <div className="text-xs sm:text-sm text-muted-foreground mt-1">{label}</div>
    </div>
  );

  if (href) {
    return (
      <Link href={href}>
        {content}
      </Link>
    );
  }

  return content;
}

