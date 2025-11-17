"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Clock, Calendar, Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";

export type MoodFilter = "any" | "light" | "dark" | "funny" | "serious" | "romantic" | "thrilling";
export type DurationFilter = "any" | "quick" | "medium" | "long";
export type YearFilter = "any" | "recent" | "2010s" | "2000s" | "classic";

interface QuickFiltersProps {
  onMoodChange?: (mood: MoodFilter) => void;
  onDurationChange?: (duration: DurationFilter) => void;
  onYearChange?: (year: YearFilter) => void;
  onSurpriseMe?: () => void;
  className?: string;
}

const moodOptions: { value: MoodFilter; label: string }[] = [
  { value: "any", label: "Any Mood" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "funny", label: "Funny" },
  { value: "serious", label: "Serious" },
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
  onSurpriseMe,
  className,
}: QuickFiltersProps) {
  const [selectedMood, setSelectedMood] = useState<MoodFilter>("any");
  const [selectedDuration, setSelectedDuration] = useState<DurationFilter>("any");
  const [selectedYear, setSelectedYear] = useState<YearFilter>("any");

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

  return (
    <div className={cn("w-full px-4 sm:px-6 lg:px-8 py-4", className)}>
      <div className="flex flex-wrap items-center gap-3">
        {/* Mood Filter */}
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {moodOptions.map((option) => (
              <Button
                key={option.value}
                variant={selectedMood === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => handleMoodChange(option.value)}
                className={cn(
                  "text-xs whitespace-nowrap",
                  selectedMood === option.value && "bg-primary text-primary-foreground"
                )}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Duration Filter */}
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {durationOptions.map((option) => (
              <Button
                key={option.value}
                variant={selectedDuration === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => handleDurationChange(option.value)}
                className={cn(
                  "text-xs whitespace-nowrap",
                  selectedDuration === option.value && "bg-primary text-primary-foreground"
                )}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Year Filter */}
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <div className="flex gap-1.5 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {yearOptions.map((option) => (
              <Button
                key={option.value}
                variant={selectedYear === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => handleYearChange(option.value)}
                className={cn(
                  "text-xs whitespace-nowrap",
                  selectedYear === option.value && "bg-primary text-primary-foreground"
                )}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Surprise Me Button */}
        {onSurpriseMe && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSurpriseMe}
            className="ml-auto text-xs whitespace-nowrap border-primary/50 hover:bg-primary/10"
          >
            <Shuffle className="h-3.5 w-3.5 mr-1.5" />
            Surprise Me
          </Button>
        )}
      </div>
    </div>
  );
}

