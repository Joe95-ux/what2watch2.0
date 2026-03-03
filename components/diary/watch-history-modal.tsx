"use client";

import { format } from "date-fns";
import { CalendarIcon, Star, Tv } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { UnifiedViewingLog } from "@/hooks/use-viewing-logs";

interface WatchHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  logs: UnifiedViewingLog[];
  title: string;
  mediaType?: "movie" | "tv";
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

export function WatchHistoryModal({ isOpen, onClose, logs, title, mediaType = "movie" }: WatchHistoryModalProps) {
  if (logs.length === 0) return null;

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
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
