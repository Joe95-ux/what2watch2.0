"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useCreateList, useUpdateList, type List, type ListItem } from "@/hooks/use-lists";
import { useSearch } from "@/hooks/use-search";
import { useDebounce } from "@/hooks/use-debounce";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { getPosterUrl } from "@/lib/tmdb";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { X, Plus, GripVertical, Search, Film, Tv } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface CreateListModalProps {
  isOpen: boolean;
  onClose: () => void;
  list?: List;
}

interface ListItemWithData extends ListItem {
  tmdbData?: TMDBMovie | TMDBSeries;
}

export default function CreateListModal({ isOpen, onClose, list }: CreateListModalProps) {
  const createList = useCreateList();
  const updateList = useUpdateList();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"PUBLIC" | "FOLLOWERS_ONLY" | "PRIVATE">("PUBLIC");
  const [tags, setTags] = useState("");
  const [items, setItems] = useState<ListItemWithData[]>([]);
  
  // Film search state
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, 300);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  const isEditing = !!list;

  // Search for films
  const { data: searchResults, isLoading: isSearching } = useSearch({
    query: debouncedQuery,
    type: "all",
  });

  // Initialize form when editing
  useEffect(() => {
    if (list) {
      setName(list.name);
      setDescription(list.description || "");
      setVisibility(list.visibility);
      setTags(list.tags.join(", "));
      setItems(list.items.map(item => ({
        ...item,
        tmdbData: undefined, // We'll fetch if needed
      })));
    } else {
      setName("");
      setDescription("");
      setVisibility("PRIVATE");
      setTags("");
      setItems([]);
    }
    setSearchQuery("");
    setIsSearchOpen(false);
  }, [list, isOpen]);

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
      toast.error(`${title} is already in the list`);
      return;
    }

    const newItem: ListItemWithData = {
      id: `temp-${Date.now()}`,
      listId: list?.id || "",
      tmdbId: film.id,
      mediaType,
      title,
      posterPath: film.poster_path,
      backdropPath: film.backdrop_path,
      releaseDate: isMovie ? film.release_date || null : null,
      firstAirDate: !isMovie ? film.first_air_date || null : null,
      position: items.length + 1,
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
    // Reorder positions
    setItems(newItems.map((item, i) => ({ ...item, position: i + 1 })));
  };

  const handleMoveItem = (fromIndex: number, toIndex: number) => {
    const newItems = [...items];
    const [moved] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, moved);
    // Reorder positions
    setItems(newItems.map((item, i) => ({ ...item, position: i + 1 })));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("List name is required");
      return;
    }

    try {
      const tagsArray = tags.trim() ? tags.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0) : [];
      
      const listItems = items.map(item => ({
        tmdbId: item.tmdbId,
        mediaType: item.mediaType,
        title: item.title,
        posterPath: item.posterPath,
        backdropPath: item.backdropPath,
        releaseDate: item.releaseDate,
        firstAirDate: item.firstAirDate,
        position: item.position,
      }));

      if (isEditing && list) {
        await updateList.mutateAsync({
          listId: list.id,
          name: name.trim(),
          description: description.trim() || undefined,
          visibility,
          tags: tagsArray,
          items: listItems,
        });
        toast.success("List updated");
      } else {
        await createList.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          visibility,
          tags: tagsArray,
          items: listItems,
        });
        toast.success("List created");
      }
      onClose();
    } catch (error) {
      toast.error(isEditing ? "Failed to update list" : "Failed to create list");
      console.error(error);
    }
  };

  const isLoading = createList.isPending || updateList.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>{isEditing ? "Edit List" : "Create List"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your list details and films"
              : "Create a new ranked list of your favorite films"}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <div className="space-y-4 py-4 overflow-y-auto scrollbar-thin flex-1">
            {/* Basic Info */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Top 10 Horror Films"
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
                  placeholder="What's this list about?"
                  disabled={isLoading}
                  rows={3}
                  maxLength={500}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="visibility">Visibility</Label>
                <Select value={visibility} onValueChange={(v: "PUBLIC" | "FOLLOWERS_ONLY" | "PRIVATE") => setVisibility(v)} disabled={isLoading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRIVATE">Private</SelectItem>
                    <SelectItem value="FOLLOWERS_ONLY">Followers Only</SelectItem>
                    <SelectItem value="PUBLIC">Public</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="horror, thriller, 2024"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Add Films Section */}
            <div className="space-y-2 border-t pt-4">
              <Label>Add Films</Label>
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

                {/* Search Results Dropdown */}
                {isSearchOpen && (
                  <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-[300px] overflow-hidden">
                    <div className="p-2 max-h-[300px] overflow-y-auto scrollbar-thin">
                      {isSearching ? (
                        <div className="space-y-2 p-2">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-16 w-full" />
                          ))}
                        </div>
                      ) : searchResults?.results && searchResults.results.length > 0 ? (
                        <div className="space-y-1">
                          {searchResults.results.slice(0, 10).map((film) => {
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
                                  "w-full flex items-center gap-3 p-2 rounded hover:bg-muted transition-colors text-left",
                                  isAdded && "opacity-50 cursor-not-allowed"
                                )}
                              >
                                {film.poster_path ? (
                                  <div className="relative h-12 w-8 flex-shrink-0 rounded overflow-hidden">
                                    <Image
                                      src={getPosterUrl(film.poster_path)}
                                      alt={title}
                                      fill
                                      className="object-cover"
                                      unoptimized
                                    />
                                  </div>
                                ) : (
                                  <div className="h-12 w-8 flex-shrink-0 rounded bg-muted flex items-center justify-center">
                                    {isMovie ? <Film className="h-4 w-4" /> : <Tv className="h-4 w-4" />}
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
                        <div className="p-4 text-center text-sm text-muted-foreground">
                          No results found
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* List Items */}
            {items.length > 0 && (
              <div className="space-y-2 border-t pt-4">
                <Label>Films in List ({items.length})</Label>
                <div className="space-y-2 max-h-[300px] overflow-y-auto scrollbar-thin">
                  {items.map((item, index) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 border rounded-lg bg-card"
                    >
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <GripVertical className="h-4 w-4 cursor-move" />
                        <span className="text-sm font-medium w-6">#{item.position}</span>
                      </div>
                      {item.posterPath ? (
                        <div className="relative h-12 w-8 flex-shrink-0 rounded overflow-hidden">
                          <Image
                            src={getPosterUrl(item.posterPath)}
                            alt={item.title}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <div className="h-12 w-8 flex-shrink-0 rounded bg-muted flex items-center justify-center">
                          {item.mediaType === "movie" ? <Film className="h-4 w-4" /> : <Tv className="h-4 w-4" />}
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
                        className="h-8 w-8"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 border-t pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (isEditing ? "Updating..." : "Creating...") : isEditing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

