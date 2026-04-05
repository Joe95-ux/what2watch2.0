"use client";

import { useState } from "react";
import { Check, ChevronDown, Plus } from "lucide-react";
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
import { cn } from "@/lib/utils";

export interface SearchableCollectionPickerOption {
  id: string;
  name: string;
}

interface SearchableCollectionPickerProps {
  value: string;
  onValueChange: (value: string, isCreateNew: boolean) => void;
  items: SearchableCollectionPickerOption[];
  placeholder?: string;
  searchPlaceholder?: string;
  /** First row label, e.g. "Create New ..." */
  createNewLabel?: string;
  emptyText?: string;
  className?: string;
}

export function SearchableCollectionPicker({
  value,
  onValueChange,
  items,
  placeholder = "Choose a list or create new",
  searchPlaceholder = "Search…",
  createNewLabel = "Create New …",
  emptyText = "No matches.",
  className,
}: SearchableCollectionPickerProps) {
  const [open, setOpen] = useState(false);

  const selected = items.find((i) => i.id === value);
  const displayLabel =
    value === "new" ? createNewLabel : selected?.name ?? placeholder;

  return (
    <Popover modal={true} open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between cursor-pointer font-normal min-h-9",
            className
          )}
        >
          <span className="truncate text-left">{displayLabel}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="p-0 w-[var(--radix-popover-trigger-width)] min-w-[240px]"
        align="start"
      >
        <Command shouldFilter>
          <CommandInput
            placeholder={searchPlaceholder}
            className="cursor-text h-9"
          />
          <CommandList className="h-[220px] max-h-[220px] overflow-y-auto scrollbar-thin">
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value={`__create__ ${createNewLabel} new`}
                onSelect={() => {
                  onValueChange("new", true);
                  setOpen(false);
                }}
                className="cursor-pointer"
              >
                <Plus className="h-4 w-4 shrink-0 mr-1" />
                <span>{createNewLabel}</span>
              </CommandItem>
              {items.map((item) => (
                <CommandItem
                  key={item.id}
                  value={`${item.name} ${item.id}`}
                  onSelect={() => {
                    onValueChange(item.id, false);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0",
                      value === item.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{item.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
