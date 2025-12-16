"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Category {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
}

interface CategorySelectProps {
  categories: Category[];
  value?: string;
  onValueChange: (value: string) => void;
  defaultCategoryId?: string;
}

export function CategorySelect({
  categories,
  value,
  onValueChange,
  defaultCategoryId,
}: CategorySelectProps) {
  const [open, setOpen] = React.useState(false);

  const selectedCategory = React.useMemo(
    () => categories.find((cat) => cat.id === value || (!value && cat.id === defaultCategoryId)),
    [categories, value, defaultCategoryId]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between cursor-pointer"
        >
          {selectedCategory ? (
            <div className="flex items-center gap-2">
              {selectedCategory.color && (
                <div
                  className="w-3 h-3 rounded-sm shrink-0"
                  style={{ backgroundColor: selectedCategory.color }}
                />
              )}
              <span className="truncate">{selectedCategory.name}</span>
            </div>
          ) : (
            "Select category..."
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
        <Command shouldFilter={true}>
          <CommandInput placeholder="Search categories..." />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>No category found.</CommandEmpty>
            <CommandGroup>
              {categories.map((category) => {
                const isSelected = value === category.id || (!value && defaultCategoryId === category.id);
                return (
                  <CommandItem
                    key={category.id}
                    value={category.name}
                    onSelect={() => {
                      onValueChange(category.id);
                      setOpen(false);
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        isSelected ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {category.color && (
                        <div
                          className="w-3 h-3 rounded-sm shrink-0"
                          style={{ backgroundColor: category.color }}
                        />
                      )}
                      <span className="truncate">{category.name}</span>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

