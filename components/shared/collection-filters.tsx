"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Search, X, ArrowUpDown, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

export type SortField = "listOrder" | "createdAt" | "title" | "releaseYear";
export type SortOrder = "asc" | "desc";
export type FilterType = "all" | "movie" | "tv";

interface CollectionFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  sortField: SortField;
  sortOrder: SortOrder;
  onSortChange: (field: SortField, order: SortOrder) => void;
  filterType: FilterType;
  onFilterChange: (type: FilterType) => void;
  searchPlaceholder?: string;
  showListOrder?: boolean;
}

export function CollectionFilters({
  searchQuery,
  onSearchChange,
  sortField,
  sortOrder,
  onSortChange,
  filterType,
  onFilterChange,
  searchPlaceholder = "Search...",
  showListOrder = true,
}: CollectionFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-full sm:w-80 2xl:w-96">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-20"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0">
          {searchQuery && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onSearchChange("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}

          {/* Sort Dropdown */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-7 w-7 cursor-pointer",
                        sortField !== "listOrder" &&
                          "bg-primary/10 text-primary"
                      )}
                    >
                      <ArrowUpDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {showListOrder && (
                      <DropdownMenuItem
                        onClick={() => onSortChange("listOrder", "asc")}
                        className={cn(
                          "cursor-pointer",
                          sortField === "listOrder" && "bg-accent"
                        )}
                      >
                        List Order
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() => onSortChange("createdAt", "desc")}
                      className={cn(
                        "cursor-pointer",
                        sortField === "createdAt" &&
                          sortOrder === "desc" &&
                          "bg-accent"
                      )}
                    >
                      Recently Added
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onSortChange("createdAt", "asc")}
                      className={cn(
                        "cursor-pointer",
                        sortField === "createdAt" &&
                          sortOrder === "asc" &&
                          "bg-accent"
                      )}
                    >
                      Oldest Added
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onSortChange("title", "asc")}
                      className={cn(
                        "cursor-pointer",
                        sortField === "title" &&
                          sortOrder === "asc" &&
                          "bg-accent"
                      )}
                    >
                      Title (A-Z)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onSortChange("title", "desc")}
                      className={cn(
                        "cursor-pointer",
                        sortField === "title" &&
                          sortOrder === "desc" &&
                          "bg-accent"
                      )}
                    >
                      Title (Z-A)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onSortChange("releaseYear", "desc")}
                      className={cn(
                        "cursor-pointer",
                        sortField === "releaseYear" &&
                          sortOrder === "desc" &&
                          "bg-accent"
                      )}
                    >
                      Release Year (Newest)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onSortChange("releaseYear", "asc")}
                      className={cn(
                        "cursor-pointer",
                        sortField === "releaseYear" &&
                          sortOrder === "asc" &&
                          "bg-accent"
                      )}
                    >
                      Release Year (Oldest)
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Sort by</p>
            </TooltipContent>
          </Tooltip>

          {/* Filter Dropdown */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-7 w-7 cursor-pointer",
                        filterType !== "all" &&
                          "bg-primary/10 text-primary"
                      )}
                    >
                      <Filter className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>Filter by type</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onFilterChange("all")}
                      className={cn(
                        "cursor-pointer",
                        filterType === "all" && "bg-accent"
                      )}
                    >
                      All Types
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onFilterChange("movie")}
                      className={cn(
                        "cursor-pointer",
                        filterType === "movie" && "bg-accent"
                      )}
                    >
                      Movies
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onFilterChange("tv")}
                      className={cn(
                        "cursor-pointer",
                        filterType === "tv" && "bg-accent"
                      )}
                    >
                      TV Shows
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Filter by type</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}

