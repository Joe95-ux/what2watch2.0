"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, X, Filter, LayoutGrid, Rows3 } from "lucide-react";
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
    <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 w-full min-w-0">
      <div className="relative w-full min-w-0 sm:w-80 2xl:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          placeholder="Search channels..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-20"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0">
          {searchQuery ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 cursor-pointer"
              onClick={() => onSearchChange("")}
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          ) : null}

          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-7 w-7 cursor-pointer",
                        keywordActive && "bg-primary/10 text-primary"
                      )}
                      aria-label="Filter by keyword"
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-[min(18rem,calc(100vw-2rem))] p-0 overflow-hidden flex flex-col"
                  >
                    <DropdownMenuLabel className="px-3 py-2 text-xs font-semibold normal-case">
                      Keyword
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator className="m-0" />
                    <div className="max-h-[min(60vh,320px)] overflow-y-auto scrollbar-thin py-1">
                      <DropdownMenuItem
                        onClick={() => onKeywordFilterChange("all")}
                        className={cn(
                          "cursor-pointer px-3 py-2",
                          keywordFilter === "all" && "bg-accent"
                        )}
                      >
                        All keywords
                      </DropdownMenuItem>
                      {keywordOptions.length === 0 ? (
                        <div className="px-3 py-3 text-sm text-muted-foreground">
                          No keywords yet — add notes to channels when editing the list
                        </div>
                      ) : (
                        keywordOptions.map((kw) => (
                          <DropdownMenuItem
                            key={kw}
                            onClick={() => onKeywordFilterChange(kw)}
                            className={cn(
                              "cursor-pointer px-3 py-2 whitespace-normal h-auto min-h-8 items-start",
                              keywordFilter === kw && "bg-accent"
                            )}
                          >
                            <span className="break-words leading-snug line-clamp-4 text-left">
                              {kw}
                            </span>
                          </DropdownMenuItem>
                        ))
                      )}
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Filter by keyword</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div
        className="flex items-center gap-1 border border-border rounded-md p-1 bg-background h-9 shrink-0"
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
            "h-7 cursor-pointer has-[>svg]:px-2",
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
            "h-7 cursor-pointer has-[>svg]:px-2",
            effectiveCardStyle === "horizontal"
              ? "bg-muted text-foreground"
              : "hover:bg-muted/50"
          )}
        >
          <Rows3 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
