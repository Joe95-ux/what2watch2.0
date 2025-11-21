"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";

export type MoodFilter = "any" | "light" | "dark" | "funny" | "romantic" | "thrilling";
export type DurationFilter = "any" | "quick" | "medium" | "long";
export type YearFilter = "any" | "recent" | "2010s" | "2000s" | "classic";
export type RegionFilter = "any" | "nollywood";

interface QuickFiltersProps {
  onMoodChange?: (mood: MoodFilter) => void;
  onDurationChange?: (duration: DurationFilter) => void;
  onYearChange?: (year: YearFilter) => void;
  onRegionChange?: (region: RegionFilter) => void;
  onSurpriseMe?: () => void;
  className?: string;
}

const moodOptions: { value: MoodFilter; label: string }[] = [
  { value: "any", label: "Any Mood" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "funny", label: "Funny" },
  { value: "romantic", label: "Romantic" },
  { value: "thrilling", label: "Thrilling" },
];

const durationOptions: { value: DurationFilter; label: string }[] = [
  { value: "any", label: "Any Duration" },
  { value: "quick", label: "< 90 min" },
  { value: "medium", label: "90-120 min" },
  { value: "long", label: "> 120 min" },
];

const yearOptions: { value: YearFilter; label: string }[] = [
  { value: "any", label: "Any Year" },
  { value: "recent", label: "Recent" },
  { value: "2010s", label: "2010s" },
  { value: "2000s", label: "2000s" },
  { value: "classic", label: "Classic" },
];

export default function QuickFilters({
  onMoodChange,
  onDurationChange,
  onYearChange,
  onRegionChange,
  onSurpriseMe,
  className,
}: QuickFiltersProps) {
  const [selectedMood, setSelectedMood] = useState<MoodFilter>("light");
  const [selectedDuration, setSelectedDuration] = useState<DurationFilter>("any");
  const [selectedYear, setSelectedYear] = useState<YearFilter>("any");
  const [selectedRegion, setSelectedRegion] = useState<RegionFilter>("any");

  const handleMoodChange = (mood: MoodFilter) => {
    setSelectedMood(mood);
    onMoodChange?.(mood);
  };

  const handleDurationChange = (duration: DurationFilter) => {
    setSelectedDuration(duration);
    onDurationChange?.(duration);
  };

  const handleYearChange = (year: YearFilter) => {
    setSelectedYear(year);
    onYearChange?.(year);
  };

  const handleRegionChange = (region: RegionFilter) => {
    setSelectedRegion(region);
    onRegionChange?.(region);
  };

  return (
    <div className={cn("w-full py-4", className)}>
      <div className="flex items-center gap-3 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Mood Filter */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {moodOptions.map((option) => (
            <Button
              key={option.value}
              variant={selectedMood === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleMoodChange(option.value)}
              className={cn(
                "text-xs whitespace-nowrap cursor-pointer",
                selectedMood === option.value && "bg-primary text-primary-foreground"
              )}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {/* Duration Filter */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {durationOptions.map((option) => (
            <Button
              key={option.value}
              variant={selectedDuration === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleDurationChange(option.value)}
              className={cn(
                "text-xs whitespace-nowrap cursor-pointer",
                selectedDuration === option.value && "bg-primary text-primary-foreground"
              )}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {/* Year Filter */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {yearOptions.map((option) => (
            <Button
              key={option.value}
              variant={selectedYear === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleYearChange(option.value)}
              className={cn(
                "text-xs whitespace-nowrap cursor-pointer",
                selectedYear === option.value && "bg-primary text-primary-foreground"
              )}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {/* Region Filter - Nollywood */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Button
            variant={selectedRegion === "nollywood" ? "default" : "outline"}
            size="sm"
            onClick={() => handleRegionChange(selectedRegion === "nollywood" ? "any" : "nollywood")}
            className={cn(
              "text-xs whitespace-nowrap cursor-pointer",
              selectedRegion === "nollywood" && "bg-primary text-primary-foreground"
            )}
          >
            Nollywood
          </Button>
        </div>

        {/* Surprise Me Button */}
        {onSurpriseMe && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSurpriseMe}
            className="ml-auto text-xs whitespace-nowrap border-primary/50 hover:bg-primary/10 cursor-pointer flex-shrink-0"
          >
            <Shuffle className="h-3.5 w-3.5 mr-1.5" />
            Surprise Me
          </Button>
        )}
      </div>
    </div>
  );
}

