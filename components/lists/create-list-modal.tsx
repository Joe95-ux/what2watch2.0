"use client";

import { useState, useEffect, useRef } from "react";
import { useCreateList, useUpdateList, type List, type ListItem } from "@/hooks/use-lists";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { X, Search, Film, Tv, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface CreateListModalProps {
  isOpen: boolean;
  onClose: () => void;
  list?: List;
  onSuccess?: (list: List) => void;
  editOnly?: boolean; // If true, only show step 1 (name, description, tags) and skip step 2
}

interface ListItemWithData extends ListItem {
  tmdbData?: TMDBMovie | TMDBSeries;
}

export default function CreateListModal({ isOpen, onClose, list, onSuccess, editOnly = false }: CreateListModalProps) {
  const createList = useCreateList();
  const updateList = useUpdateList();
  const [step, setStep] = useState<1 | 2>(1);
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
        tmdbData: undefined,
      })));
      // If editOnly, always stay on step 1; otherwise go to step 2 if items exist
      setStep(editOnly ? 1 : (list.items.length > 0 ? 2 : 1));
    } else {
      setName("");
      setDescription("");
      setVisibility("PUBLIC");
      setTags("");
      setItems([]);
      setStep(1);
    }
    setSearchQuery("");
    setIsSearchOpen(false);
  }, [list, isOpen, editOnly]);

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
    // Reorder positions
    setItems(newItems.map((item, i) => ({ ...item, position: i + 1 })));
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    setItems(newItems.map((item, i) => ({ ...item, position: i + 1 })));
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    setItems(newItems.map((item, i) => ({ ...item, position: i + 1 })));
  };

  const handleNext = () => {
    if (step === 1) {
      if (!name.trim()) {
        toast.error("List name is required");
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
      toast.error("List name is required");
      return;
    }

    try {
      const tagsArray = tags.trim() ? tags.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0) : [];
      
      // If editOnly mode, only update name, description, visibility, and tags (no items)
      if (editOnly && list) {
        await updateList.mutateAsync({
          listId: list.id,
          name: name.trim(),
          description: description.trim() || undefined,
          visibility,
          tags: tagsArray,
        });
        toast.success("List updated");
        onSuccess?.(list);
        onClose();
        return;
      }
      
      const listItems = items.map((item, index) => ({
        tmdbId: item.tmdbId,
        mediaType: item.mediaType,
        title: item.title,
        posterPath: item.posterPath,
        backdropPath: item.backdropPath,
        releaseDate: item.releaseDate,
        firstAirDate: item.firstAirDate,
        position: index + 1, // Use index-based position
      }));

      let result: List;

      if (isEditing && list) {
        result = await updateList.mutateAsync({
          listId: list.id,
          name: name.trim(),
          description: description.trim() || undefined,
          visibility,
          tags: tagsArray,
          items: listItems,
        });
        toast.success("List updated");
      } else {
        result = await createList.mutateAsync({
          name: name.trim(),
          description: description.trim() || undefined,
          visibility,
          tags: tagsArray,
          items: listItems,
        });
        toast.success("List created");
      }
      onSuccess?.(result);
      onClose();
    } catch (error) {
      toast.error(isEditing ? "Failed to update list" : "Failed to create list");
      console.error(error);
    }
  };

  const isLoading = createList.isPending || updateList.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Step Indicators */}
        <div className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="text-[1.5rem] font-bold mb-4">
            {isEditing ? "Edit List" : "Create List"}
          </DialogTitle>
          {!editOnly && (
            <>
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
                  Add Films
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors",
                  step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  1
                </div>
                <div className={cn(
                  "h-0.5 w-12 transition-colors",
                  step >= 2 ? "bg-primary" : "bg-muted"
                )} />
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors",
                  step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                  2
                </div>
              </div>
            </>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-6">
            {step === 1 ? (
              <div className="space-y-6 max-w-2xl mx-auto">
                <div className="space-y-2">
                  <Label htmlFor="name">List Name *</Label>
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
                    placeholder="What's this list about? Share your thoughts on these films..."
                    disabled={isLoading}
                    rows={5}
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
                      <SelectItem value="PUBLIC">Public - Anyone can view</SelectItem>
                      <SelectItem value="FOLLOWERS_ONLY">Followers Only - Only your followers can view</SelectItem>
                      <SelectItem value="PRIVATE">Private - Only you can view</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="horror, thriller, 2024 (comma-separated)"
                    disabled={isLoading}
                  />
                  <p className="text-sm text-muted-foreground">
                    Add tags to help others discover your list
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-6 max-w-4xl mx-auto">
                {/* Add Films Section */}
                <div className="space-y-3">
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

                {/* List Items */}
                {items.length > 0 ? (
                  <div className="space-y-3">
                    <Label>Films in List ({items.length})</Label>
                    <div className="space-y-3">
                      {items.map((item, index) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-4 p-4 border rounded-lg bg-card hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex flex-col gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleMoveUp(index)}
                              disabled={index === 0 || isLoading}
                              className="h-8 w-8 cursor-pointer"
                            >
                              <ChevronUp className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleMoveDown(index)}
                              disabled={index === items.length - 1 || isLoading}
                              className="h-8 w-8 cursor-pointer"
                            >
                              <ChevronDown className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm flex-shrink-0">
                              #{index + 1}
                            </div>
                            
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
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 border border-dashed rounded-lg">
                    <Film className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No films added yet</h3>
                    <p className="text-muted-foreground">
                      Search and add films to your list above
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 border-t px-6 py-4 gap-2">
            {editOnly ? (
              <>
                <Button type="button" variant="outline" onClick={onClose} disabled={isLoading} className="cursor-pointer">
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="cursor-pointer">
                  {isLoading ? "Updating..." : "Save Changes"}
                </Button>
              </>
            ) : step === 1 ? (
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
