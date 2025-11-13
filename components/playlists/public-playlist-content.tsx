"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft } from "lucide-react";
import MovieCard from "@/components/browse/movie-card";
import ContentDetailModal from "@/components/browse/content-detail-modal";
import { getPosterUrl } from "@/lib/tmdb";
import type { Playlist } from "@/hooks/use-playlists";

type PlaylistWithUser = Playlist & {
  user?: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
};

interface PublicPlaylistContentProps {
  playlistId: string;
}

export default function PublicPlaylistContent({ playlistId }: PublicPlaylistContentProps) {
  const router = useRouter();
  const [selectedItem, setSelectedItem] = useState<{ item: TMDBMovie | TMDBSeries; type: "movie" | "tv" } | null>(null);
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoggedVisit, setHasLoggedVisit] = useState(false);

  useEffect(() => {
    const fetchPlaylist = async () => {
      try {
        setIsLoading(true);
        const res = await fetch(`/api/playlists/${playlistId}?public=true`);
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || "Failed to load playlist");
          return;
        }
        const data = await res.json();
        setPlaylist(data.playlist);
      } catch (err) {
        setError("Failed to load playlist");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlaylist();
  }, [playlistId]);

  useEffect(() => {
    if (!playlist || hasLoggedVisit) {
      return;
    }

    const controller = new AbortController();

    const logVisit = async () => {
      try {
        await fetch("/api/analytics/playlist-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playlistId,
            type: "VISIT",
            source: "public_view",
          }),
          signal: controller.signal,
        });
        setHasLoggedVisit(true);
      } catch (logError) {
        if ((logError as Error).name !== "AbortError") {
          console.error("Failed to log playlist visit", logError);
        }
      }
    };

    logVisit();

    return () => controller.abort();
  }, [playlist, hasLoggedVisit, playlistId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-48 w-full mb-8" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">
            {error === "Playlist is private" ? "Private Playlist" : "Playlist not found"}
          </h2>
          <p className="text-muted-foreground mb-4">
            {error === "Playlist is private"
              ? "This playlist is private and cannot be viewed."
              : error || "This playlist doesn't exist."}
          </p>
          <Button onClick={() => router.push("/browse")}>Back to Browse</Button>
        </div>
      </div>
    );
  }

  const playlistWithUser = playlist as PlaylistWithUser;

  // Convert playlist items to TMDB format
  const itemsAsTMDB = (playlist.items || []).map((playlistItem) => {
    if (playlistItem.mediaType === "movie") {
      const movie: TMDBMovie = {
        id: playlistItem.tmdbId,
        title: playlistItem.title,
        overview: "",
        poster_path: playlistItem.posterPath,
        backdrop_path: playlistItem.backdropPath,
        release_date: playlistItem.releaseDate || "",
        vote_average: 0,
        vote_count: 0,
        genre_ids: [],
        popularity: 0,
        adult: false,
        original_language: "",
        original_title: playlistItem.title,
      };
      return { item: movie, type: "movie" as const };
    } else {
      const tv: TMDBSeries = {
        id: playlistItem.tmdbId,
        name: playlistItem.title,
        overview: "",
        poster_path: playlistItem.posterPath,
        backdrop_path: playlistItem.backdropPath,
        first_air_date: playlistItem.firstAirDate || "",
        vote_average: 0,
        vote_count: 0,
        genre_ids: [],
        popularity: 0,
        original_language: "",
        original_name: playlistItem.title,
      };
      return { item: tv, type: "tv" as const };
    }
  });

  const coverImage = playlist.coverImage
    ? playlist.coverImage
    : itemsAsTMDB.length > 0 && itemsAsTMDB[0].item.poster_path
    ? getPosterUrl(itemsAsTMDB[0].item.poster_path, "original")
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Cover */}
      <div className="relative -mt-[65px] h-[40vh] min-h-[300px] max-h-[565px] overflow-hidden">
        {coverImage ? (
          <>
            <img
              src={coverImage}
              alt={playlist.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
          </>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5" />
        )}

        <div className="absolute inset-0 flex items-end">
          <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 w-full">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push("/browse")}
                  className="mb-4"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Browse
                </Button>
                <h1 className="text-4xl font-bold mb-2">{playlist.name}</h1>
                {playlist.description && (
                  <p className="text-lg text-muted-foreground mb-4 max-w-2xl">
                    {playlist.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    {itemsAsTMDB.length} {itemsAsTMDB.length === 1 ? "item" : "items"}
                  </span>
                  <span>•</span>
                  <span className="text-primary">Public Playlist</span>
                  {playlistWithUser.user && (
                    <>
                      <span>•</span>
                      <span>By {playlistWithUser.user.displayName || playlistWithUser.user.username || "Unknown"}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {itemsAsTMDB.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-muted-foreground">This playlist is empty.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {itemsAsTMDB.map(({ item, type }) => (
              <div
                key={`${item.id}-${type}`}
                onClick={() => setSelectedItem({ item, type })}
                className="cursor-pointer"
              >
                <MovieCard item={item} type={type} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <ContentDetailModal
          item={selectedItem.item}
          type={selectedItem.type}
          isOpen={!!selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </div>
  );
}

