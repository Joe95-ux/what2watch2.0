"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon, Star, Tv, Edit } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { UnifiedViewingLog } from "@/hooks/use-viewing-logs";
import { useUpdateEpisodeViewingLog } from "@/hooks/use-viewing-logs";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface WatchHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: UnifiedViewingLog[];
  title: string;
  mediaType?: "movie" | "tv";
  tmdbId?: number; // Required for updating episode logs
}

// Format episode information for display
function formatEpisodeInfo(log: UnifiedViewingLog): string | null {
  if (log.type === "episodeLog") {
    if (log.seasonNumber !== undefined) {
      if (log.episodeNumber !== undefined) {
        // Single episode
        return `Season ${log.seasonNumber}, Episode ${log.episodeNumber}`;
      } else if (log.episodeNumbers && log.episodeNumbers.length > 1) {
        // Multiple episodes - show range
        const sorted = [...log.episodeNumbers].sort((a, b) => a - b);
        const first = sorted[0];
        const last = sorted[sorted.length - 1];
        
        if (first === last) {
          return `Season ${log.seasonNumber}, Episode ${first}`;
        } else if (sorted.length === last - first + 1) {
          // Consecutive episodes - show range
          return `Season ${log.seasonNumber}, Episodes ${first}-${last}`;
        } else {
          // Non-consecutive - show count
          return `Season ${log.seasonNumber}, ${sorted.length} episodes`;
        }
      }
    }
  } else if (log.type === "viewingLog" && log.title) {
    // Check if title contains episode info (e.g., "Foundation S1E1" or "Foundation S1, S2")
    const episodePattern = /S(\d+)\s*E(\d+)/i;
    const seasonPattern = /S(\d+)/gi;
    const episodeMatch = log.title.match(episodePattern);
    const seasonMatches = [...log.title.matchAll(seasonPattern)];
    
    if (episodeMatch) {
      return `Season ${episodeMatch[1]}, Episode ${episodeMatch[2]}`;
    } else if (seasonMatches.length > 0) {
      const seasons = seasonMatches.map(m => m[1]).join(", ");
      return `Season${seasonMatches.length > 1 ? "s" : ""} ${seasons}`;
    }
  }
  return null;
}

export function WatchHistoryModal({ isOpen, onClose, logs, title, mediaType = "movie", tmdbId }: WatchHistoryModalProps) {
  const [editingLog, setEditingLog] = useState<UnifiedViewingLog | null>(null);
  const [editDate, setEditDate] = useState<Date | null>(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const updateEpisodeLog = useUpdateEpisodeViewingLog();
  const queryClient = useQueryClient();

  if (logs.length === 0) return null;

  const handleEditClick = (log: UnifiedViewingLog) => {
    setEditingLog(log);
    setEditDate(new Date(log.watchedAt));
    setIsCalendarOpen(true);
  };

  const handleDateUpdate = async () => {
    if (!editingLog || !editDate || !tmdbId) return;

    try {
      if (editingLog.type === "episodeLog") {
        // For grouped episodes, we need to update all episodes in the group
        if (editingLog.episodeNumbers && editingLog.episodeNumbers.length > 1 && editingLog.seasonNumber !== undefined) {
          // Batch update all episodes in the group
          const res = await fetch("/api/episode-viewing-logs/batch-update", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              tvShowTmdbId: tmdbId,
              seasonNumber: editingLog.seasonNumber,
              oldDate: editingLog.watchedAt,
              newDate: editDate.toISOString(),
            }),
          });

          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || "Failed to update episode logs");
          }

          toast.success("Episode dates updated successfully");
        } else if (editingLog.episodeLogId) {
          // Single episode log
          await updateEpisodeLog.mutateAsync({
            logId: editingLog.episodeLogId,
            watchedAt: editDate.toISOString(),
          });
          toast.success("Episode date updated successfully");
        }
      }

      // Invalidate queries to refresh the timeline
      await queryClient.invalidateQueries({ queryKey: ["viewing-logs-by-content"] });
      
      setEditingLog(null);
      setIsCalendarOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update date");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Watch History - {title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto scrollbar-thin min-h-0">
          <div className="relative py-4">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />
            
            <div className="space-y-6">
              {logs.map((log, index) => {
                const isLatest = index === 0;
                const watchedDate = new Date(log.watchedAt);
                const episodeInfo = formatEpisodeInfo(log);
                
                return (
                  <div key={log.id} className="relative flex gap-4">
                    {/* Timeline dot */}
                    <div className="relative z-10 flex-shrink-0">
                      <div
                        className={cn(
                          "h-8 w-8 rounded-full border-2 flex items-center justify-center",
                          isLatest
                            ? "bg-green-500 border-green-500"
                            : "bg-background border-border"
                        )}
                      >
                        {isLatest ? (
                          <CalendarIcon className="h-4 w-4 text-white" />
                        ) : (
                          <div className="h-2 w-2 rounded-full bg-muted-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-4">
                      <div className="bg-card border rounded-lg p-4 space-y-3">
                        {/* Date */}
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                          <span className="font-semibold text-sm">
                            {format(watchedDate, "MMMM d, yyyy")}
                          </span>
                          {isLatest && (
                            <span className="text-xs text-green-500 font-medium">(Latest)</span>
                          )}
                        </div>

                        {/* Season/Episode Info for TV shows */}
                        {mediaType === "tv" && episodeInfo && (
                          <div className="flex items-center gap-2">
                            <Tv className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">
                              {episodeInfo}
                            </span>
                          </div>
                        )}

                        {/* Title for viewingLog entries (if no episode info extracted) */}
                        {log.type === "viewingLog" && log.title && !episodeInfo && (
                          <div className="text-sm font-medium text-foreground">
                            {log.title}
                          </div>
                        )}

                        {/* Rating */}
                        {log.rating && (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className={cn(
                                    "h-4 w-4",
                                    star <= log.rating!
                                      ? "text-yellow-400 fill-yellow-400"
                                      : "text-muted-foreground"
                                  )}
                                />
                              ))}
                            </div>
                            <span className="text-sm text-muted-foreground">{log.rating}/5</span>
                          </div>
                        )}

                        {/* Notes */}
                        {log.notes && (
                          <div>
                            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                              {log.notes}
                            </p>
                          </div>
                        )}

                        {/* Tags */}
                        {log.tags && log.tags.length > 0 && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {log.tags.map((tag, tagIndex) => (
                              <span
                                key={tagIndex}
                                className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Edit Button for Episode Logs */}
                        {log.type === "episodeLog" && tmdbId && (
                          <div className="pt-2 border-t">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditClick(log)}
                              className="cursor-pointer"
                              disabled={updateEpisodeLog.isPending}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Date
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Edit Date Dialog */}
      {editingLog && (
        <Dialog open={!!editingLog} onOpenChange={(open) => !open && setEditingLog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Watch Date</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Date Watched</Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal cursor-pointer",
                        !editDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {editDate ? format(editDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={editDate || undefined}
                      onSelect={(date) => {
                        if (date) {
                          setEditDate(date);
                          setIsCalendarOpen(false);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingLog(null);
                    setIsCalendarOpen(false);
                  }}
                  disabled={updateEpisodeLog.isPending}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleDateUpdate}
                  disabled={updateEpisodeLog.isPending || !editDate}
                >
                  {updateEpisodeLog.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
