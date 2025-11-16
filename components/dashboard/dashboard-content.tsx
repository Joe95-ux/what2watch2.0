"use client";

import { useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useFavorites } from "@/hooks/use-favorites";
import { usePlaylists } from "@/hooks/use-playlists";
import { useRecentlyViewed, recentlyViewedToTMDBItem } from "@/hooks/use-recently-viewed";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import DashboardRow from "@/components/dashboard/dashboard-row";
import PlaylistCard from "@/components/browse/playlist-card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Heart, Clock, Film, Share2 } from "lucide-react";
import { usePlaylistAnalytics } from "@/hooks/use-playlist-analytics";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { usePersonalizedContent } from "@/hooks/use-movies";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function DashboardContent() {
  const { user } = useUser();
  const { data: favorites = [], isLoading: isLoadingFavorites } = useFavorites();
  const { data: playlists = [], isLoading: isLoadingPlaylists } = usePlaylists();
  const { data: recentlyViewed = [], isLoading: isLoadingRecentlyViewed } = useRecentlyViewed();
  const { data: playlistAnalytics, isLoading: isLoadingPlaylistAnalytics } = usePlaylistAnalytics(); // Show all data by default
  const { data: preferences } = useUserPreferences();
  
  // Normalize favoriteGenres - handle Extended JSON format from MongoDB
  const normalizeGenres = (genres: unknown[]): number[] => {
    return genres
      .map((g) => {
        // Handle Extended JSON format: {"$numberLong":"18"} or {"$numberInt":"18"}
        if (typeof g === "object" && g !== null) {
          const obj = g as Record<string, unknown>;
          if ("$numberLong" in obj && typeof obj.$numberLong === "string") {
            return Number.parseInt(obj.$numberLong, 10);
          }
          if ("$numberInt" in obj && typeof obj.$numberInt === "string") {
            return Number.parseInt(obj.$numberInt, 10);
          }
        }
        // Handle regular numbers or string numbers
        if (typeof g === "number") return g;
        if (typeof g === "string") {
          const parsed = Number.parseInt(g, 10);
          return Number.isNaN(parsed) ? null : parsed;
        }
        return null;
      })
      .filter((g): g is number => g !== null && !Number.isNaN(g));
  };

  const favoriteGenres = useMemo(() => {
    if (!preferences?.favoriteGenres) return [];
    return normalizeGenres(preferences.favoriteGenres as unknown[]);
  }, [preferences]);

  const preferredTypes = useMemo(() => {
    return (preferences?.preferredTypes || []) as ("movie" | "tv")[];
  }, [preferences]);

  const { data: personalizedContent = [], isLoading: isLoadingPersonalized } = usePersonalizedContent(
    favoriteGenres,
    preferredTypes.length > 0 ? preferredTypes : ["movie", "tv"]
  );

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
    const shares = playlistAnalytics?.totals.shares ?? 0;
    const visits = playlistAnalytics?.totals.visits ?? 0;

    return {
      watchlistCount: favorites.length,
      playlistCount: playlists.length,
      recentlyViewedCount: recentlyViewed.length,
      totalItems: favorites.length + playlists.reduce((acc, p) => acc + (p._count?.items || 0), 0),
      playlistReach: {
        total: playlistAnalytics?.totals.totalEngagement ?? shares + visits,
        shares,
        visits,
      },
    };
  }, [favorites, playlists, recentlyViewed, playlistAnalytics]);

  const displayName = user?.fullName || user?.firstName || "User";
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Header with Greeting */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">
            {greeting}, {displayName}
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Here&apos;s what&apos;s happening with your watchlist
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8 max-w-7xl">
          <StatCard
            icon={Heart}
            label="Watchlist"
            value={stats.watchlistCount}
            isLoading={isLoadingFavorites}
            href="/dashboard/my-list"
          />
          <StatCard
            icon={BookOpen}
            label="Playlists"
            value={stats.playlistCount}
            isLoading={isLoadingPlaylists}
            href="/dashboard/playlists"
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
          <StatCard
            icon={Share2}
            label="Playlist Reach"
            value={stats.playlistReach.total}
            helper={`${stats.playlistReach.visits.toLocaleString()} visits • ${stats.playlistReach.shares.toLocaleString()} shares`}
            isLoading={isLoadingPlaylistAnalytics}
            href="/dashboard/my-stats"
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
          <DashboardRow
            title="Continue Watching"
            items={recentlyViewedItems}
            type={recentlyViewedItems.length > 0 ? ("title" in recentlyViewedItems[0] ? "movie" : "tv") : "movie"}
          />
        ) : null}

        {/* Made for [Username] Section */}
        {favoriteGenres.length > 0 && (
          isLoadingPersonalized ? (
            <div className="mb-12">
              <Skeleton className="h-7 w-48 mb-6 !bg-gray-200 dark:!bg-accent" />
              <div className="flex gap-4 overflow-x-hidden">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="aspect-[2/3] w-[200px] flex-shrink-0 rounded-lg !bg-gray-200 dark:!bg-accent" />
                ))}
              </div>
            </div>
          ) : personalizedContent.length > 0 ? (
            <DashboardRow
              title={`Made for ${displayName}`}
              items={personalizedContent.slice(0, 20)}
              type={preferredTypes.length === 1 ? preferredTypes[0] : "movie"}
            />
          ) : null
        )}

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
          <DashboardRow
            title="My Watchlist"
            items={favoriteItems}
            type={favoriteItems.length > 0 ? ("title" in favoriteItems[0] ? "movie" : "tv") : "movie"}
            href="/dashboard/my-list"
          />
        ) : (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-medium">My Watchlist</h2>
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
              <h2 className="text-2xl font-medium">My Playlists</h2>
              <Link href="/playlists" className="text-sm text-muted-foreground hover:text-foreground">
                View all →
              </Link>
            </div>
            <div className="overflow-hidden">
              <div className="flex gap-4 overflow-x-auto pb-4">
                {playlists.slice(0, 10).map((playlist) => (
                  <PlaylistCard key={playlist.id} playlist={playlist} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-medium">My Playlists</h2>
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
  helper?: string;
}

function StatCard({ icon: Icon, label, value, isLoading, href, helper }: StatCardProps) {
  // Different gradient backgrounds for each icon type
  // Use icon component reference for comparison
  const isHeart = Icon === Heart;
  const isBookOpen = Icon === BookOpen;
  const isClock = Icon === Clock;
  const isFilm = Icon === Film;

  const bgClass = isHeart
    ? "bg-gradient-to-br from-pink-500/20 to-rose-500/20 dark:from-pink-500/30 dark:to-rose-500/30"
    : isBookOpen
    ? "bg-gradient-to-br from-blue-500/20 to-cyan-500/20 dark:from-blue-500/30 dark:to-cyan-500/30"
    : isClock
    ? "bg-gradient-to-br from-purple-500/20 to-indigo-500/20 dark:from-purple-500/30 dark:to-indigo-500/30"
    : isFilm
    ? "bg-gradient-to-br from-orange-500/20 to-amber-500/20 dark:from-orange-500/30 dark:to-amber-500/30"
    : "bg-gradient-to-br from-primary/20 to-primary/10";

  const colorClass = isHeart
    ? "text-pink-600 dark:text-pink-400"
    : isBookOpen
    ? "text-blue-600 dark:text-blue-400"
    : isClock
    ? "text-purple-600 dark:text-purple-400"
    : isFilm
    ? "text-orange-600 dark:text-orange-400"
    : "text-primary";

  const content = (
    <div className={cn(
      "bg-card border rounded-lg p-4 sm:p-6 transition-colors w-full h-full flex flex-col overflow-hidden",
      href && "hover:bg-accent/50 cursor-pointer"
    )}>
      <div className="flex items-center justify-between mb-2">
        <div className={cn("p-2 rounded-lg", bgClass)}>
          <Icon className={cn("h-5 w-5", colorClass)} />
        </div>
        {href && (
          <span className="text-xs text-muted-foreground flex-shrink-0 ml-auto">View →</span>
        )}
      </div>
      {isLoading ? (
        <Skeleton className="h-8 w-16 !bg-gray-200 dark:!bg-accent" />
      ) : (
        <div className="text-xl sm:text-2xl font-bold break-words">
          {Number.isFinite(value) ? value.toLocaleString() : "0"}
        </div>
      )}
      <div className="text-xs sm:text-sm text-muted-foreground mt-1 break-words flex-shrink-0">{label}</div>
      {helper ? (
        <div className="text-[0.7rem] sm:text-xs text-muted-foreground/80 mt-0.5 break-words flex-shrink-0">
          {helper}
        </div>
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="h-full">
        {content}
      </Link>
    );
  }

  return content;
}

