"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useLogViewing } from "@/hooks/use-viewing-logs";
import { toast } from "sonner";
import { TMDBMovie, TMDBSeries } from "@/lib/tmdb";

interface LogFilmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  item: TMDBMovie | TMDBSeries;
  type: "movie" | "tv";
}

export default function LogFilmDialog({ isOpen, onClose, item, type }: LogFilmDialogProps) {
  const [watchedDate, setWatchedDate] = useState<Date>(new Date());
  const [notes, setNotes] = useState("");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const logViewing = useLogViewing();

  const handleSubmit = async () => {
    try {
      const title = "title" in item ? item.title : item.name;
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
      });
      toast.success("Film logged to your diary!");
      setNotes("");
      setWatchedDate(new Date());
      onClose();
    } catch (error) {
      toast.error("Failed to log film. Please try again.");
      console.error("Error logging film:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Log Film</DialogTitle>
          <DialogDescription>
            Record when you watched this {type === "movie" ? "movie" : "TV show"} and add notes.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="watched-date">Date Watched</Label>
            <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !watchedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {watchedDate ? format(watchedDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
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
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add your thoughts, rating, or any notes about this viewing..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={logViewing.isPending}>
            {logViewing.isPending ? "Logging..." : "Log Film"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

