"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CalendarIcon, Heart, Star, Bookmark } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useLogViewing } from "@/hooks/use-viewing-logs";
import { useToggleFavorite } from "@/hooks/use-favorites";
import { useToggleWatchlist } from "@/hooks/use-watchlist";
import { toast } from "sonner";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";
import { ScrollArea } from "@/components/ui/scroll-area";

interface LogToDiaryDropdownProps {
  item: TMDBMovie | TMDBSeries;
  type: "movie" | "tv";
  trigger: React.ReactNode;
}

export default function LogToDiaryDropdown({ item, type, trigger }: LogToDiaryDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [watchedDate, setWatchedDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [tags, setTags] = useState("");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  
  const logViewing = useLogViewing();
  const toggleFavorite = useToggleFavorite();
  const toggleWatchlist = useToggleWatchlist();
  
  const isLiked = toggleFavorite.isFavorite(item.id, type);
  const isInWatchlist = toggleWatchlist.isInWatchlist(item.id, type);

  const handleLogFilm = async () => {
    if (logViewing.isPending) return;
    
    try {
      const title = "title" in item ? item.title : item.name;
      
      // Parse tags
      const tagsArray = tags.trim() ? tags.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0) : [];
      
      // Log the film
      await logViewing.mutateAsync({
        tmdbId: item.id,
        mediaType: type,
        title,
        posterPath: item.poster_path || null,
        backdropPath: item.backdrop_path || null,
        releaseDate: "release_date" in item ? item.release_date || null : null,
        firstAirDate: "first_air_date" in item ? item.first_air_date || null : null,
        watchedAt: watchedDate.toISOString(),
        notes: notes.trim() || null,
        rating: rating || null,
        tags: tagsArray,
      });
      
      toast.success("Film logged to your diary!");
      setNotes("");
      setRating(null);
      setTags("");
      setWatchedDate(new Date());
      setIsOpen(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to log film";
      toast.error(errorMessage.includes("already") ? errorMessage : "Failed to log film. Please try again.");
      console.error("Error logging film:", error);
    }
  };

  const handleLikeToggle = async () => {
    await toggleFavorite.toggle(item, type);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="z-[110] w-80 p-4"
        onClick={(e) => {
          e.stopPropagation();
        }}
      >
        <DropdownMenuLabel>Log to Diary</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="max-h-[500px] pr-4">
          <div className="space-y-4 mt-4" onClick={(e) => e.stopPropagation()}>
          {/* Like and Watchlist Buttons */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "flex items-center gap-2 cursor-pointer",
                isLiked && "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
              )}
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await handleLikeToggle();
              }}
            >
              <Heart 
                className={cn(
                  "h-4 w-4",
                  isLiked 
                    ? "text-red-500 fill-red-500" 
                    : "text-muted-foreground"
                )} 
              />
              <span className="text-sm">
                {isLiked ? "Liked" : "Like"}
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "flex items-center gap-2 cursor-pointer",
                isInWatchlist && "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800"
              )}
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                await toggleWatchlist.toggle(item, type);
              }}
            >
              <Bookmark 
                className={cn(
                  "h-4 w-4",
                  isInWatchlist 
                    ? "text-blue-500 fill-blue-500" 
                    : "text-muted-foreground"
                )} 
              />
              <span className="text-sm">
                {isInWatchlist ? "In Watchlist" : "Watchlist"}
              </span>
            </Button>
          </div>
          
          {/* Star Rating */}
          <div className="space-y-2">
            <Label className="text-sm">Rating (Optional)</Label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setRating(rating === star ? null : star);
                  }}
                  className="focus:outline-none cursor-pointer"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <Star
                    className={cn(
                      "h-5 w-5 transition-colors",
                      rating && star <= rating
                        ? "text-yellow-400 fill-yellow-400"
                        : "text-muted-foreground"
                    )}
                  />
                </button>
              ))}
              {rating && (
                <span className="ml-2 text-sm text-muted-foreground">
                  {rating}/5
                </span>
              )}
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="watched-date" className="text-sm">Date Watched</Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal cursor-pointer",
                    !watchedDate && "text-muted-foreground"
                  )}
                  onMouseDown={(e) => {
                    // Prevent closing the dropdown when clicking the date picker button
                    e.stopPropagation();
                  }}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {watchedDate ? format(watchedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-auto p-0 z-[120]" 
                align="start"
              >
                <Calendar
                  mode="single"
                  selected={watchedDate}
                  onSelect={(date) => {
                    if (date) {
                      setWatchedDate(date);
                      setIsCalendarOpen(false);
                    }
                  }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add your thoughts, rating, or any notes..."
              value={notes}
              onChange={(e) => {
                e.stopPropagation();
                setNotes(e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
              rows={3}
              className="resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="tags" className="text-sm">Tags (Optional)</Label>
            <Input
              id="tags"
              placeholder="Add tags separated by commas (e.g., Netflix, horror, favorite)"
              value={tags}
              onChange={(e) => {
                e.stopPropagation();
                setTags(e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-xs text-muted-foreground">
              Separate multiple tags with commas
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleLogFilm();
              }}
              disabled={logViewing.isPending}
              className="cursor-pointer"
            >
              {logViewing.isPending ? "Logging..." : "Log Film"}
            </Button>
          </div>
          </div>
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

