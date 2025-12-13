"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useFavorites, useRemoveFavorite } from "@/hooks/use-favorites";
import { useAllGenres } from "@/hooks/use-genres";
import { useFavoriteChannels } from "@/hooks/use-favorite-channels";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LayoutGrid, List, X, Plus, Star, ChevronLeft, ChevronRight, Youtube } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import MovieCard from "@/components/browse/movie-card";
import ContentDetailModal from "@/components/browse/content-detail-modal";
import { MovieCardSkeleton } from "@/components/skeletons/movie-card-skeleton";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import { getChannelProfilePath } from "@/lib/channel-path";
import { toast } from "sonner";
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

type ViewMode = "grid" | "list";
type FilterType = "all" | "movie" | "tv";
type SortBy = "recent" | "title" | "year";

export default function MyListContent() {
  const router = useRouter();
  const { data: favorites = [], isLoading } = useFavorites();
  const { data: favoriteChannels = [], isLoading: isLoadingChannels } = useFavoriteChannels();
  const removeFavorite = useRemoveFavorite();
  const { data: allGenres = [] } = useAllGenres();
  
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [selectedGenre, setSelectedGenre] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [itemToRemove, setItemToRemove] = useState<{ tmdbId: number; mediaType: string; title: string } | null>(null);
  const [selectedItem, setSelectedItem] = useState<{ item: TMDBMovie | TMDBSeries; type: "movie" | "tv" } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Convert favorites to TMDB format for display
  const favoritesAsTMDB = useMemo(() => {
    return favorites.map((fav) => {
      if (fav.mediaType === "movie") {
        const movie: TMDBMovie = {
          id: fav.tmdbId,
          title: fav.title,
          overview: "",
          poster_path: fav.posterPath,
          backdrop_path: fav.backdropPath,
          release_date: fav.releaseDate || "",
          vote_average: 0,
          vote_count: 0,
          genre_ids: [],
          popularity: 0,
          adult: false,
          original_language: "",
          original_title: fav.title,
        };
        return { item: movie, type: "movie" as const, favoriteId: fav.id };
      } else {
        const tv: TMDBSeries = {
          id: fav.tmdbId,
          name: fav.title,
          overview: "",
          poster_path: fav.posterPath,
          backdrop_path: fav.backdropPath,
          first_air_date: fav.firstAirDate || "",
          vote_average: 0,
          vote_count: 0,
          genre_ids: [],
          popularity: 0,
          original_language: "",
          original_name: fav.title,
        };
        return { item: tv, type: "tv" as const, favoriteId: fav.id };
      }
    });
  }, [favorites]);

  // Filter and sort
  const filteredAndSorted = useMemo(() => {
    let filtered = favoritesAsTMDB;

    // Filter by type
    if (filterType !== "all") {
      filtered = filtered.filter((f) => f.type === filterType);
    }

    // Filter by genre (would need genre data from API - simplified for now)
    // This would require fetching genre data for each item

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === "recent") {
        const aFav = favorites.find((f) => f.id === a.favoriteId);
        const bFav = favorites.find((f) => f.id === b.favoriteId);
        if (!aFav || !bFav) return 0;
        return new Date(bFav.createdAt).getTime() - new Date(aFav.createdAt).getTime();
      } else if (sortBy === "title") {
        const aTitle = "title" in a.item ? a.item.title : a.item.name;
        const bTitle = "title" in b.item ? b.item.title : b.item.name;
        return aTitle.localeCompare(bTitle);
      } else if (sortBy === "year") {
        const aDate = a.type === "movie" ? a.item.release_date : a.item.first_air_date;
        const bDate = b.type === "movie" ? b.item.release_date : b.item.first_air_date;
        const aYear = aDate ? new Date(aDate).getFullYear() : 0;
        const bYear = bDate ? new Date(bDate).getFullYear() : 0;
        return bYear - aYear;
      }
      return 0;
    });

    return filtered;
  }, [favoritesAsTMDB, filterType, selectedGenre, sortBy, favorites]);

  const itemsPerPage = viewMode === "grid" ? 24 : 12;
  const totalPages = filteredAndSorted.length > 0 ? Math.ceil(filteredAndSorted.length / itemsPerPage) : 1;

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAndSorted.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAndSorted, currentPage, itemsPerPage]);

  const pageNumbers = useMemo(() => {
    const maxButtons = 5;
    if (totalPages <= maxButtons) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) {
      return [1, 2, 3, 4, 5];
    }
    if (currentPage >= totalPages - 2) {
      return Array.from({ length: maxButtons }, (_, i) => totalPages - 4 + i);
    }
    return [currentPage - 2, currentPage - 1, currentPage, currentPage + 1, currentPage + 2];
  }, [currentPage, totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, selectedGenre, sortBy, viewMode]);

  useEffect(() => {
    const maxPage = filteredAndSorted.length > 0 ? Math.ceil(filteredAndSorted.length / itemsPerPage) : 1;
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [filteredAndSorted.length, currentPage, itemsPerPage]);

  const handleRemove = async () => {
    if (!itemToRemove) return;
    
    try {
      await removeFavorite.mutateAsync({
        tmdbId: itemToRemove.tmdbId,
        mediaType: itemToRemove.mediaType as "movie" | "tv",
      });
      toast.success(`Removed ${itemToRemove.title} from your list`);
      setItemToRemove(null);
    } catch (error) {
      toast.error("Failed to remove item");
      console.error(error);
    }
  };

  const movieCount = favorites.filter((f) => f.mediaType === "movie").length;
  const tvCount = favorites.filter((f) => f.mediaType === "tv").length;

  if (isLoading) {
    return (
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-10 w-64 mb-6" />
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <MovieCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col items-center justify-center text-center space-y-4">
          <div className="h-24 w-24 rounded-full bg-muted flex items-center justify-center">
            <Plus className="h-12 w-12 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold">Your list is empty</h2>
          <p className="text-muted-foreground max-w-md">
            Start building your list by clicking the heart icon on any movie or TV show you want to save.
          </p>
          <Button asChild className="mt-4 cursor-pointer">
            <Link href="/browse">Browse Content</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Channels Section - First Section */}
      {favoriteChannels.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-semibold mb-4">Channels</h2>
          <div className="relative group/carousel">
            <Carousel
              opts={{
                align: "start",
                slidesToScroll: 4,
                breakpoints: {
                  "(max-width: 640px)": { slidesToScroll: 2 },
                  "(max-width: 1024px)": { slidesToScroll: 3 },
                  "(max-width: 1280px)": { slidesToScroll: 4 },
                },
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-2 md:-ml-4 gap-4">
                {favoriteChannels.map((channel) => (
                  <CarouselItem key={channel.id} className="pl-2 md:pl-4 basis-[140px] sm:basis-[160px]">
                    <button
                      onClick={() => router.push(getChannelProfilePath(channel.channelId, channel.slug))}
                      className="group block text-center cursor-pointer w-full"
                    >
                      <div className="relative w-32 h-32 mx-auto rounded-full overflow-hidden mb-3 group-hover:scale-105 transition-transform">
                        {channel.thumbnail ? (
                          <Image
                            src={channel.thumbnail}
                            alt={channel.title || "Channel"}
                            fill
                            className="object-cover"
                            sizes="128px"
                            unoptimized
                          />
                        ) : (
                          <div className="absolute inset-0 bg-muted flex items-center justify-center">
                            <Youtube className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <p className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                        {channel.title || "Channel"}
                      </p>
                    </button>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious
                className="left-0 h-full w-[45px] rounded-l-lg rounded-r-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer"
              />
              <CarouselNext
                className="right-0 h-full w-[45px] rounded-r-lg rounded-l-none border-0 bg-black/60 hover:bg-black/80 backdrop-blur-sm opacity-0 group-hover/carousel:opacity-100 transition-opacity duration-200 hidden md:flex items-center justify-center cursor-pointer"
              />
            </Carousel>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">My List</h1>
            <p className="text-muted-foreground">
              {favorites.length} {favorites.length === 1 ? "item" : "items"}
              {movieCount > 0 && tvCount > 0 && ` • ${movieCount} movies • ${tvCount} TV shows`}
            </p>
          </div>
        </div>

        {/* Filters and View Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-3">
            {/* Type Filter */}
            <Select value={filterType} onValueChange={(value) => setFilterType(value as FilterType)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="movie">Movies</SelectItem>
                <SelectItem value="tv">TV Shows</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort By */}
            <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortBy)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recently Added</SelectItem>
                <SelectItem value="title">Title (A-Z)</SelectItem>
                <SelectItem value="year">Year (Newest)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2 border rounded-md p-1">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("grid")}
              className="h-8 w-8 p-0 cursor-pointer"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setViewMode("list")}
              className="h-8 w-8 p-0 cursor-pointer"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {filteredAndSorted.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted-foreground">No items match your filters.</p>
          <Button
            variant="outline"
            className="mt-4 cursor-pointer"
            onClick={() => {
              setFilterType("all");
              setSelectedGenre("all");
            }}
          >
            Clear Filters
          </Button>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {paginatedItems.map(({ item, type, favoriteId }) => (
            <div key={favoriteId} className="relative group">
              <MovieCard
                item={item}
                type={type}
                onCardClick={(clickedItem, clickedType) => setSelectedItem({ item: clickedItem, type: clickedType })}
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 hover:bg-black/80 rounded-full h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  const title = "title" in item ? item.title : item.name;
                  setItemToRemove({
                    tmdbId: item.id,
                    mediaType: type,
                    title,
                  });
                }}
              >
                <X className="h-4 w-4 text-white" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[300px]">
                    Title
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Type
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Year
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider w-12">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedItems.map(({ item, type, favoriteId }) => {
                  const title = "title" in item ? item.title : item.name;
                  const releaseDate = type === "movie" ? item.release_date : item.first_air_date;
                  const year = releaseDate ? new Date(releaseDate).getFullYear() : null;
                  const posterPath = item.poster_path;

                  return (
                    <tr
                      key={favoriteId}
                      className="hover:bg-muted/20 transition-colors cursor-pointer group"
                      onClick={() => setSelectedItem({ item, type })}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          {posterPath ? (
                            <div className="relative w-20 h-12 rounded overflow-hidden flex-shrink-0 bg-muted">
                              <img
                                src={`https://image.tmdb.org/t/p/w300${posterPath}`}
                                alt={title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            </div>
                          ) : (
                            <div className="w-20 h-12 rounded bg-muted flex-shrink-0 flex items-center justify-center">
                              <span className="text-xs text-muted-foreground">No Image</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm group-hover:text-primary transition-colors">
                              {title}
                            </p>
                            {item.overview && (
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                {item.overview}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground whitespace-nowrap">
                        <span className="uppercase">{type}</span>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground whitespace-nowrap">
                        {year || "N/A"}
                      </td>
                      <td className="px-4 py-4">
                        {item.vote_average > 0 ? (
                          <div className="flex items-center gap-1.5">
                            <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                            <span className="text-sm font-medium">{item.vote_average.toFixed(1)}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">N/A</span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setItemToRemove({
                              tmdbId: item.id,
                              mediaType: type,
                              title,
                            });
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filteredAndSorted.length > 0 && totalPages > 1 && (
        <div className="mt-8 flex w-full items-center justify-center gap-2 overflow-auto px-2 py-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <div className="flex items-center gap-1 overflow-auto">
            {pageNumbers.map((page) => (
              <Button
                key={page}
                variant={currentPage === page ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentPage(page)}
                className="min-w-[40px]"
              >
                {page}
              </Button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={!!itemToRemove} onOpenChange={(open) => !open && setItemToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove from My List?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove <strong>{itemToRemove?.title}</strong> from your list? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              disabled={removeFavorite.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeFavorite.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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

