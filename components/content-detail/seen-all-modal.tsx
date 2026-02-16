"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useUser } from "@clerk/nextjs";
import { useMarkSeasonsSeen, useUnmarkSeasonsSeen } from "@/hooks/use-episode-tracking";
import { useQuery } from "@tanstack/react-query";

interface Season {
  id: number;
  name: string;
  overview: string;
  season_number: number;
  episode_count: number;
  air_date: string | null;
  poster_path: string | null;
}

interface SeenAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  seasons: Season[];
  tvShowId: number;
  tvShowName: string;
  onSeasonsSelected: (selectedSeasons: number[]) => void;
}

export default function SeenAllModal({
  isOpen,
  onClose,
  seasons,
  tvShowId,
  tvShowName,
  onSeasonsSelected,
}: SeenAllModalProps) {
  const { isSignedIn } = useUser();
  const markSeasonsSeen = useMarkSeasonsSeen();
  const unmarkSeasonsSeen = useUnmarkSeasonsSeen();
  const [selectedSeasons, setSelectedSeasons] = useState<Set<number>>(new Set());
  
  // Filter out season 0 (specials)
  const regularSeasons = seasons.filter((s) => s.season_number > 0);

  // Fetch which seasons are already seen
  const { data: seenSeasonsData } = useQuery<{ seenSeasons: number[] }>({
    queryKey: ["seen-seasons", tvShowId],
    queryFn: async () => {
      const res = await fetch(`/api/episodes/seasons/check?tvShowTmdbId=${tvShowId}`);
      if (!res.ok) return { seenSeasons: [] };
      const data = await res.json();
      return { seenSeasons: Array.isArray(data.seenSeasons) ? data.seenSeasons : [] };
    },
    enabled: isOpen && !!tvShowId,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });

  const seenSeasons = Array.isArray(seenSeasonsData?.seenSeasons) ? seenSeasonsData.seenSeasons : [];

  // Initialize selectedSeasons with already seen seasons when modal opens
  useEffect(() => {
    if (isOpen) {
      if (seenSeasons.length > 0) {
        setSelectedSeasons(new Set(seenSeasons));
      } else {
        setSelectedSeasons(new Set());
      }
    }
  }, [isOpen, seenSeasons]);

  const handleSelectAll = () => {
    if (selectedSeasons.size === regularSeasons.length) {
      setSelectedSeasons(new Set());
    } else {
      setSelectedSeasons(new Set(regularSeasons.map((s) => s.season_number)));
    }
  };

  const handleSeasonToggle = (seasonNumber: number) => {
    const newSelected = new Set(selectedSeasons);
    if (newSelected.has(seasonNumber)) {
      newSelected.delete(seasonNumber);
    } else {
      newSelected.add(seasonNumber);
    }
    setSelectedSeasons(newSelected);
  };

  const handleConfirm = async () => {
    if (!isSignedIn) {
      return;
    }
    
    try {
      // Determine which seasons to mark and which to unmark
      const seasonsToMark: number[] = [];
      const seasonsToUnmark: number[] = [];

      for (const season of regularSeasons) {
        const isSelected = selectedSeasons.has(season.season_number);
        const wasSeen = Array.isArray(seenSeasons) && seenSeasons.includes(season.season_number);

        if (isSelected && !wasSeen) {
          // Need to mark as seen
          seasonsToMark.push(season.season_number);
        } else if (!isSelected && wasSeen) {
          // Need to unmark as seen
          seasonsToUnmark.push(season.season_number);
        }
      }

      // Mark new seasons
      if (seasonsToMark.length > 0) {
        await markSeasonsSeen.mutateAsync({
          tvShowTmdbId: tvShowId,
          tvShowTitle: tvShowName,
          seasonNumbers: seasonsToMark,
        });
      }

      // Unmark removed seasons
      if (seasonsToUnmark.length > 0) {
        await unmarkSeasonsSeen.mutateAsync({
          tvShowTmdbId: tvShowId,
          seasonNumbers: seasonsToUnmark,
        });
      }

      // Only call onSeasonsSelected and close if there were changes
      if (seasonsToMark.length > 0 || seasonsToUnmark.length > 0) {
        onSeasonsSelected(Array.from(selectedSeasons));
        onClose();
      } else {
        // No changes, just close
        onClose();
      }
    } catch (error) {
      // Error is handled by the hooks
    }
  };

  const allSelected = selectedSeasons.size === regularSeasons.length && regularSeasons.length > 0;
  const someSelected = selectedSeasons.size > 0 && selectedSeasons.size < regularSeasons.length;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-md">
        <DialogHeader>
          <DialogTitle>Mark Seasons as Seen</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="text-sm text-muted-foreground">
            Select which seasons of <span className="font-semibold text-foreground">{tvShowName}</span> you have seen.
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="select-all"
                checked={allSelected}
                onCheckedChange={handleSelectAll}
                className={cn(
                  someSelected && "data-[state=checked]:bg-primary/50"
                )}
              />
              <Label
                htmlFor="select-all"
                className="text-sm font-medium cursor-pointer"
              >
                Select All ({regularSeasons.length} seasons)
              </Label>
            </div>
            
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {regularSeasons.map((season) => {
                const isSelected = selectedSeasons.has(season.season_number);
                return (
                  <div
                    key={season.id}
                    className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={`season-${season.season_number}`}
                      checked={isSelected}
                      onCheckedChange={() => handleSeasonToggle(season.season_number)}
                    />
                    <Label
                      htmlFor={`season-${season.season_number}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {season.name || `Season ${season.season_number}`}
                      <span className="text-muted-foreground ml-2">
                        ({season.episode_count} {season.episode_count === 1 ? "episode" : "episodes"})
                      </span>
                    </Label>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={onClose} className="cursor-pointer">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={markSeasonsSeen.isPending || unmarkSeasonsSeen.isPending}
            className="bg-primary text-primary-foreground cursor-pointer"
          >
            {(markSeasonsSeen.isPending || unmarkSeasonsSeen.isPending) ? "Saving..." : "Confirm"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
