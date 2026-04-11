"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, LayoutGrid, Rows3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChannelListChannelsToolbarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  keywordFilter: string;
  onKeywordFilterChange: (value: string) => void;
  keywordOptions: string[];
  effectiveCardStyle: "centered" | "horizontal";
  onCardStyleChange: (style: "centered" | "horizontal") => void;
  isCardStylePending?: boolean;
}

export function ChannelListChannelsToolbar({
  searchQuery,
  onSearchChange,
  keywordFilter,
  onKeywordFilterChange,
  keywordOptions,
  effectiveCardStyle,
  onCardStyleChange,
  isCardStylePending = false,
}: ChannelListChannelsToolbarProps) {
  const keywordActive = keywordFilter !== "all";

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 w-full min-w-0">
      <div className="relative flex-1 min-w-0 w-full">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search channels..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-10 h-9 sm:h-10 w-full"
        />
        {searchQuery ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 cursor-pointer"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap sm:flex-nowrap items-stretch sm:items-center gap-2 w-full sm:w-auto min-w-0 overflow-x-auto pb-0.5 sm:pb-0 scrollbar-hide">
        <div
          className="flex items-center gap-1 border border-border rounded-md p-1 bg-background h-9 sm:h-10 shrink-0"
          role="group"
          aria-label="YouTube channel card layout"
        >
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onCardStyleChange("centered")}
            disabled={isCardStylePending}
            title="Centered cards"
            aria-label="Centered cards"
            aria-pressed={effectiveCardStyle === "centered"}
            className={cn(
              "h-7 sm:h-8 cursor-pointer has-[>svg]:px-2",
              effectiveCardStyle === "centered"
                ? "bg-muted text-foreground"
                : "hover:bg-muted/50"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onCardStyleChange("horizontal")}
            disabled={isCardStylePending}
            title="Horizontal cards"
            aria-label="Horizontal cards"
            aria-pressed={effectiveCardStyle === "horizontal"}
            className={cn(
              "h-7 sm:h-8 cursor-pointer has-[>svg]:px-2",
              effectiveCardStyle === "horizontal"
                ? "bg-muted text-foreground"
                : "hover:bg-muted/50"
            )}
          >
            <Rows3 className="h-4 w-4" />
          </Button>
        </div>

        <Select value={keywordFilter} onValueChange={onKeywordFilterChange}>
          <SelectTrigger
            className={cn(
              "w-full min-w-0 sm:w-[190px] sm:min-w-[180px] sm:max-w-[min(240px,100%)] h-9 sm:h-10 cursor-pointer shrink-0",
              keywordActive && "border-primary/40 bg-primary/5"
            )}
            aria-label="Filter channels by keyword from list notes"
          >
            <SelectValue placeholder="Keywords" />
          </SelectTrigger>
          <SelectContent className="max-h-[min(60vh,320px)] overflow-hidden">
            <div className="max-h-[min(60vh,320px)] overflow-y-auto scrollbar-thin">
              <SelectItem value="all" className="cursor-pointer">
                All keywords
              </SelectItem>
              {keywordOptions.map((kw) => (
                <SelectItem
                  key={kw}
                  value={kw}
                  className="cursor-pointer py-2 h-auto min-h-9 items-start"
                >
                  <span className="break-words whitespace-normal leading-snug line-clamp-4 text-left">
                    {kw}
                  </span>
                </SelectItem>
              ))}
            </div>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
