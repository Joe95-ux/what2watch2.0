"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useCreatePlaylist, useUpdatePlaylist, type Playlist, type PlaylistItem } from "@/hooks/use-playlists";
import { useSearch } from "@/hooks/use-search";
import { useDebounce } from "@/hooks/use-debounce";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { getPosterUrl } from "@/lib/tmdb";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { X, Search, Film, Tv, ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface CreatePlaylistModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlist?: Playlist;
}

interface PlaylistItemWithData extends PlaylistItem {
  tmdbData?: TMDBMovie | TMDBSeries;
}

export default function CreatePlaylistModal({ isOpen, onClose, playlist }: CreatePlaylistModalProps) {
  const createPlaylist = useCreatePlaylist();
  const updatePlaylist = useUpdatePlaylist();
  const [step, setStep] = useState<1 | 2>(1);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [items, setItems] = useState<PlaylistItemWithData[]>([]);
  
  // Film search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, 300);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const isEditing = !!playlist;

  // Search for films
  const { data: searchResults, isLoading: isSearching } = useSearch({
    query: debouncedQuery,
    type: "all",
  });

  useEffect(() => {
    if (playlist) {
      setName(playlist.name);
      setDescription(playlist.description || "");
      setIsPublic(playlist.isPublic);
      setItems((playlist.items || []).map(item => ({
        ...item,
        tmdbData: undefined,
      })));
      setStep((playlist.items?.length || 0) > 0 ? 2 : 1);
    } else {
      setName("");
      setDescription("");
      setIsPublic(false);
      setItems([]);
      setStep(1);
    }
    setSearchQuery("");
    setIsSearchOpen(false);
  }, [playlist, isOpen]);

  // Close search dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };

    if (isSearchOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isSearchOpen]);

  // Show search results when query changes
  useEffect(() => {
    if (debouncedQuery.trim() && searchResults?.results) {
      setIsSearchOpen(true);
    } else {
      setIsSearchOpen(false);
    }
  }, [debouncedQuery, searchResults]);

  const handleAddFilm = (film: TMDBMovie | TMDBSeries) => {
    const isMovie = "title" in film;
    const title = isMovie ? film.title : film.name;
    const mediaType = isMovie ? "movie" : "tv";
    
    // Check if already added
    if (items.some(item => item.tmdbId === film.id && item.mediaType === mediaType)) {
      toast.error(`${title} is already in the playlist`);
      return;
    }

    const newItem: PlaylistItemWithData = {
      id: `temp-${Date.now()}`,
      playlistId: playlist?.id || "",
      tmdbId: film.id,
      mediaType,
      title,
      posterPath: film.poster_path,
      backdropPath: film.backdrop_path,
      releaseDate: isMovie ? film.release_date || null : null,
      firstAirDate: !isMovie ? film.first_air_date || null : null,
      order: items.length,
      note: null,
      createdAt: new Date().toISOString(),
      tmdbData: film,
    };

    setItems([...items, newItem]);
    setSearchQuery("");
    setIsSearchOpen(false);
    toast.success(`Added ${title}`);
  };

  const handleRemoveItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    // Reorder
    setItems(newItems.map((item, i) => ({ ...item, order: i })));
  };

  const handleNext = () => {
    if (step === 1) {
      if (!name.trim()) {
        toast.error("Playlist name is required");
        return;
      }
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Playlist name is required");
      return;
    }

    try {
      const playlistItems = items.map(item => ({
        tmdbId: item.tmdbId,
        mediaType: item.mediaType,
        title: item.title,
        posterPath: item.posterPath,
        backdropPath: item.backdropPath,
        releaseDate: item.releaseDate,
        firstAirDate: item.firstAirDate,
        order: item.order,
      }));

      if (isEditing && playlist) {
        await updatePlaylist.mutateAsync({
          playlistId: playlist.id,
          updates: {
            name: name.trim(),
            description: description.trim() || undefined,
            isPublic,
            items: playlistItems,
          },
        });
        toast.success("Playlist updated");
      } else {
        await createPlaylist.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          isPublic,
          items: playlistItems,
        });
        toast.success("Playlist created");
      }
      onClose();
    } catch (error) {
      toast.error(isEditing ? "Failed to update playlist" : "Failed to create playlist");
      console.error(error);
    }
  };

  const isLoading = createPlaylist.isPending || updatePlaylist.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-[calc(100vw-1rem)] sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col p-0"
        onClick={(e) => {
          e.stopPropagation();
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
        }}
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
      >
        <div className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-[1.5rem] font-bold mb-2">
            {isEditing ? "Edit Playlist" : "Create Playlist"}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mb-4">
            {isEditing
              ? "Update your playlist details and titles"
              : "Name your playlist, set visibility, then add movies and TV shows"}
          </p>
          <div className="flex items-center gap-8 mb-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className={cn(
                "text-sm font-medium transition-colors cursor-pointer",
                step === 1 ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Basic Info
            </button>
            <button
              type="button"
              onClick={() => name.trim() && setStep(2)}
              className={cn(
                "text-sm font-medium transition-colors cursor-pointer",
                step === 2 ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                !name.trim() && "opacity-50 cursor-not-allowed"
              )}
            >
              Add Titles
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors",
                step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              1
            </div>
            <div
              className={cn(
                "h-0.5 w-12 transition-colors",
                step >= 2 ? "bg-primary" : "bg-muted"
              )}
            />
            <div
              className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors",
                step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}
            >
              2
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6">
            {step === 1 ? (
              <div className="space-y-6 max-w-2xl mx-auto">
                <div className="space-y-2">
                  <Label htmlFor="name">Playlist Name *</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="My Awesome Playlist"
                    disabled={isLoading}
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What's this playlist about? Share some context..."
                    disabled={isLoading}
                    rows={5}
                    maxLength={500}
                  />
                </div>
                <div className="flex items-center justify-between border rounded-xl p-4">
                  <div>
                    <Label htmlFor="public">Public Playlist</Label>
                    <p className="text-sm text-muted-foreground">
                      {isPublic ? "Anyone can view this playlist" : "Only you can view this playlist"}
                    </p>
                  </div>
                  <Switch
                    id="public"
                    checked={isPublic}
                    onCheckedChange={setIsPublic}
                    disabled={isLoading}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-6 max-w-4xl mx-auto">
                <div className="space-y-3">
                  <Label>Add Titles</Label>
                  <div className="relative" ref={searchContainerRef}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => {
                          if (debouncedQuery.trim() && searchResults?.results) {
                            setIsSearchOpen(true);
                          }
                        }}
                        placeholder="Search for movies or TV shows..."
                        disabled={isLoading}
                        className="pl-10"
                      />
                    </div>

                    {isSearchOpen && (
                      <div className="absolute z-50 w-full mt-2 bg-background border rounded-lg shadow-lg max-h-[400px] overflow-hidden">
                        <div className="p-3 max-h-[400px] overflow-y-auto scrollbar-thin">
                          {isSearching ? (
                            <div className="space-y-2">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-20 w-full" />
                              ))}
                            </div>
                          ) : searchResults?.results && searchResults.results.length > 0 ? (
                            <div className="space-y-1">
                              {searchResults.results.slice(0, 20).map((film) => {
                                const isMovie = "title" in film;
                                const title = isMovie ? film.title : film.name;
                                const isAdded = items.some(
                                  item => item.tmdbId === film.id && item.mediaType === (isMovie ? "movie" : "tv")
                                );

                                return (
                                  <button
                                    key={`${film.id}-${isMovie ? "movie" : "tv"}`}
                                    type="button"
                                    onClick={() => !isAdded && handleAddFilm(film)}
                                    disabled={isAdded}
                                    className={cn(
                                      "w-full flex items-center gap-4 p-3 rounded-lg hover:bg-muted transition-colors text-left cursor-pointer",
                                      isAdded && "opacity-50 cursor-not-allowed"
                                    )}
                                  >
                                    {film.poster_path ? (
                                      <div className="relative h-16 w-12 flex-shrink-0 rounded overflow-hidden">
                                        <Image
                                          src={getPosterUrl(film.poster_path)}
                                          alt={title}
                                          fill
                                          className="object-cover"
                                          unoptimized
                                        />
                                      </div>
                                    ) : (
                                      <div className="h-16 w-12 flex-shrink-0 rounded bg-muted flex items-center justify-center">
                                        {isMovie ? <Film className="h-5 w-5" /> : <Tv className="h-5 w-5" />}
                                      </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{title}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {isMovie ? "Movie" : "TV Show"}
                                        {isMovie && film.release_date && ` • ${new Date(film.release_date).getFullYear()}`}
                                        {!isMovie && film.first_air_date && ` • ${new Date(film.first_air_date).getFullYear()}`}
                                      </p>
                                    </div>
                                    {isAdded && (
                                      <Badge variant="secondary" className="text-xs">Added</Badge>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          ) : debouncedQuery.trim() ? (
                            <div className="p-6 text-center text-sm text-muted-foreground">
                              No results found
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {items.length > 0 ? (
                  <div className="space-y-3">
                    <Label>Titles in Playlist ({items.length})</Label>
                    <div className="space-y-3">
                      {items.map((item, index) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                        >
                          {item.posterPath ? (
                            <div className="relative h-16 w-12 flex-shrink-0 rounded overflow-hidden">
                              <Image
                                src={getPosterUrl(item.posterPath)}
                                alt={item.title}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                          ) : (
                            <div className="h-16 w-12 flex-shrink-0 rounded bg-muted flex items-center justify-center">
                              {item.mediaType === "movie" ? <Film className="h-5 w-5" /> : <Tv className="h-5 w-5" />}
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.title}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {item.mediaType}
                            </p>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveItem(index)}
                            disabled={isLoading}
                            className="h-9 w-9 cursor-pointer"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 border border-dashed rounded-lg">
                    <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No titles added yet</h3>
                    <p className="text-muted-foreground">
                      Search and add movies or TV shows above
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 border-t px-6 py-4 gap-2">
            {step === 1 ? (
              <>
                <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="cursor-pointer">
                  Cancel
                </Button>
                <Button type="button" onClick={handleNext} disabled={isLoading} className="cursor-pointer">
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" onClick={handleBack} disabled={isLoading} className="cursor-pointer">
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="cursor-pointer">
                  {isLoading ? (isEditing ? "Updating..." : "Creating...") : isEditing ? "Update" : "Create"}
                </Button>
              </>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

