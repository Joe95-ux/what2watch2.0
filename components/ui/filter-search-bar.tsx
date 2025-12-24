"use client";

import { useState, useRef, useEffect } from "react";
import { Search, ArrowUpDown, Filter, ChevronDown, ChevronUp, X, ArrowDown, ArrowUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface FilterOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

interface FilterSearchBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  sortOrder: "asc" | "desc";
  onSortChange: (order: "asc" | "desc") => void;
  filters: {
    label: string;
    value: string;
    options: FilterOption[];
    onValueChange: (value: string) => void;
  }[];
  onClearAll?: () => void;
  hasActiveFilters?: boolean;
}

export function FilterSearchBar({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  sortOrder,
  onSortChange,
  filters,
  onClearAll,
  hasActiveFilters = false,
}: FilterSearchBarProps) {
  const [isFilterRowOpen, setIsFilterRowOpen] = useState(false);
  const filterRowRef = useRef<HTMLDivElement>(null);
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});

  // Focus on filter row when opened
  useEffect(() => {
    if (isFilterRowOpen && filterRowRef.current) {
      // Small delay to ensure smooth transition
      setTimeout(() => {
        filterRowRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 100);
    }
  }, [isFilterRowOpen]);

  const toggleDropdown = (filterLabel: string) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [filterLabel]: !prev[filterLabel],
    }));
  };

  const handleFilterValueChange = (filterLabel: string, value: string, onValueChange: (value: string) => void) => {
    onValueChange(value);
    setOpenDropdowns((prev) => ({
      ...prev,
      [filterLabel]: false,
    }));
  };

  const getFilterDisplayValue = (filter: { value: string; options: FilterOption[] }) => {
    const option = filter.options.find((opt) => opt.value === filter.value);
    return option?.label || filter.value;
  };

  return (
    <div className="space-y-3">
      {/* Top Row: Search + Sort + Filter Button */}
      <div className="flex items-center gap-2">
        {/* Search - Takes most width */}
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 pr-3 h-9"
          />
          {searchValue && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 cursor-pointer"
              onClick={() => onSearchChange("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Sort Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-9 px-3 gap-2 cursor-pointer whitespace-nowrap",
                sortOrder !== "desc" && "bg-primary/10 text-primary"
              )}
            >
              <ArrowUpDown className="h-4 w-4" />
              <span className="hidden sm:inline">
                {sortOrder === "desc" ? "Newest" : "Oldest"}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => onSortChange("desc")}
              className={cn("cursor-pointer", sortOrder === "desc" && "bg-accent")}
            >
              <span className="flex items-center gap-2">
                <ArrowDown className="h-4 w-4" />
                Newest First
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onSortChange("asc")}
              className={cn("cursor-pointer", sortOrder === "asc" && "bg-accent")}
            >
              <span className="flex items-center gap-2">
                <ArrowUp className="h-4 w-4" />
                Oldest First
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Filter Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsFilterRowOpen(!isFilterRowOpen)}
          className={cn(
            "h-9 px-3 gap-2 cursor-pointer whitespace-nowrap",
            hasActiveFilters && "bg-primary/10 text-primary"
          )}
        >
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filter</span>
        </Button>
      </div>

      {/* Filter Row - Collapsible with smooth transition */}
      <div
        ref={filterRowRef}
        className={cn(
          "overflow-hidden transition-all duration-300 ease-in-out",
          isFilterRowOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="overflow-x-auto scrollbar-hide pb-2">
          <div className="flex items-center gap-4 min-w-max px-1">
            {filters.map((filter) => {
              const isOpen = openDropdowns[filter.label] || false;
              return (
                <DropdownMenu
                  key={filter.label}
                  open={isOpen}
                  onOpenChange={(open) => setOpenDropdowns((prev) => ({ ...prev, [filter.label]: open }))}
                >
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      onClick={() => toggleDropdown(filter.label)}
                      className="flex items-center gap-1.5 text-sm text-foreground hover:text-primary transition-colors cursor-pointer whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm px-2 py-1"
                    >
                      <span>{filter.label}:</span>
                      <span className="font-medium">{getFilterDisplayValue(filter)}</span>
                      {isOpen ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-56">
                    {filter.options.map((option) => (
                      <DropdownMenuItem
                        key={option.value}
                        onClick={() => handleFilterValueChange(filter.label, option.value, filter.onValueChange)}
                        className={cn(
                          "cursor-pointer",
                          filter.value === option.value && "bg-accent"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          {option.icon}
                          {option.label}
                        </span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}

            {/* Clear All Button */}
            {onClearAll && hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="h-8 px-3 text-sm text-muted-foreground hover:text-foreground cursor-pointer whitespace-nowrap"
              >
                <X className="h-3.5 w-3.5 mr-1.5" />
                Clear All
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

