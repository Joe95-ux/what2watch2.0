"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BiSolidCategory } from "react-icons/bi";
import { ChevronDown } from "lucide-react";

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
}

interface CategoryCustomizeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type FilterType = "all" | "selected" | "unselected";

export function CategoryCustomizeModal({ open, onOpenChange }: CategoryCustomizeModalProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch all categories
  const { data: categoriesData, isLoading: isLoadingCategories } = useQuery({
    queryKey: ["forum-categories"],
    queryFn: async () => {
      const response = await fetch("/api/forum/categories");
      if (!response.ok) return { categories: [] };
      return response.json();
    },
  });

  // Fetch user's category preferences
  const { data: preferencesData, isLoading: isLoadingPreferences } = useQuery({
    queryKey: ["forum-category-preferences"],
    queryFn: async () => {
      const response = await fetch("/api/forum/categories/preferences");
      if (!response.ok) return { categoryIds: [] };
      return response.json();
    },
    enabled: open,
  });

  // Initialize selected categories when preferences load
  useEffect(() => {
    if (preferencesData?.categoryIds) {
      setSelectedCategoryIds(preferencesData.categoryIds);
    }
  }, [preferencesData]);

  // Save preferences mutation
  const savePreferences = useMutation({
    mutationFn: async (categoryIds: string[]) => {
      const response = await fetch("/api/forum/categories/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryIds }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to save preferences");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-category-preferences"] });
      queryClient.invalidateQueries({ queryKey: ["forum-categories"] });
      toast.success("Category preferences saved");
      setIsSaving(false);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to save preferences");
      setIsSaving(false);
    },
  });

  const categories = categoriesData?.categories || [];
  const isLoading = isLoadingCategories || isLoadingPreferences;

  // Filter categories based on search and filter type
  const filteredCategories = useMemo(() => {
    let filtered = categories;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((cat: Category) =>
        cat.name.toLowerCase().includes(query) ||
        (cat.description && cat.description.toLowerCase().includes(query))
      );
    }

    // Apply filter type
    if (filterType === "selected") {
      filtered = filtered.filter((cat: Category) =>
        selectedCategoryIds.includes(cat.id)
      );
    } else if (filterType === "unselected") {
      filtered = filtered.filter((cat: Category) =>
        !selectedCategoryIds.includes(cat.id)
      );
    }

    return filtered;
  }, [categories, searchQuery, filterType, selectedCategoryIds]);

  const handleToggleCategory = (categoryId: string) => {
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSave = () => {
    setIsSaving(true);
    savePreferences.mutate(selectedCategoryIds);
  };

  const handleReset = () => {
    // Reset to all categories (empty array means show all)
    setSelectedCategoryIds([]);
  };

  const getCategoryColor = (color?: string | null) => {
    if (!color) return "bg-blue-500";
    return color;
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!isSaving) {
        onOpenChange(newOpen);
      }
    }}>
      <DialogContent className="sm:max-w-[40rem] h-[90vh] sm:h-[80vh] flex flex-col p-0">
        {/* Fixed Header */}
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle>Customize Categories</DialogTitle>
          <DialogDescription>
            Select which categories you want to see in your sidebar. Unselected categories will be hidden from view.
          </DialogDescription>
        </DialogHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4">
          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
            {/* Search - takes most space on large screens */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filter Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full lg:w-auto cursor-pointer"
                >
                  {filterType === "all" && "All"}
                  {filterType === "selected" && `Selected (${selectedCategoryIds.length})`}
                  {filterType === "unselected" && `Unselected (${categories.length - selectedCategoryIds.length})`}
                  <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="flex flex-col gap-2">
                  <DropdownMenuItem
                    onClick={() => setFilterType("all")}
                    className={cn(
                      "cursor-pointer",
                      filterType === "all" && "bg-accent"
                    )}
                  >
                    All
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFilterType("selected")}
                    className={cn(
                      "cursor-pointer",
                      filterType === "selected" && "bg-accent"
                    )}
                  >
                    Selected ({selectedCategoryIds.length})
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setFilterType("unselected")}
                    className={cn(
                      "cursor-pointer",
                      filterType === "unselected" && "bg-accent"
                    )}
                  >
                    Unselected ({categories.length - selectedCategoryIds.length})
                  </DropdownMenuItem>

                </div>
                
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Categories List */}
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : filteredCategories.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No categories found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredCategories.map((category: Category) => {
                const isSelected = selectedCategoryIds.includes(category.id);
                return (
                  <div
                    key={category.id}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                      isSelected && "bg-accent/50",
                      "hover:bg-accent/30"
                    )}
                  >
                    {/* Colored Left Border */}
                    <div
                      className="w-1 h-12 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: getCategoryColor(category.color),
                      }}
                    />

                    {/* Category Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {category.icon ? (
                          <span className="text-base">{category.icon}</span>
                        ) : (
                          <BiSolidCategory className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium">{category.name}</span>
                      </div>
                      {category.description && (
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {category.description}
                        </p>
                      )}
                    </div>

                    {/* Checkbox */}
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleToggleCategory(category.id)}
                      className="flex-shrink-0"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          <div className="flex items-center justify-between w-full">
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={isSaving || selectedCategoryIds.length === 0}
            >
              Reset to Defaults
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

