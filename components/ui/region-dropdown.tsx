"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronsUpDown, Check, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCountryFlagEmoji } from "@/hooks/use-watch-regions";

export interface RegionOption {
  iso_3166_1: string;
  english_name: string;
}

interface RegionDropdownProps {
  regions: RegionOption[];
  value: string;
  onValueChange: (code: string) => void;
  className?: string;
  triggerClassName?: string;
  align?: "start" | "end";
}

export function RegionDropdown({
  regions,
  value,
  onValueChange,
  className,
  triggerClassName,
  align = "end",
}: RegionDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const selected = regions.find((r) => r.iso_3166_1 === value);

  const filtered = useMemo(() => {
    if (!search.trim()) return regions;
    const q = search.toLowerCase().trim();
    return regions.filter(
      (r) =>
        r.english_name.toLowerCase().includes(q) ||
        r.iso_3166_1.toLowerCase().includes(q)
    );
  }, [regions, search]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        setSearch("");
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && open) {
        setOpen(false);
        setSearch("");
      }
    };

    if (open) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [open]);

  const handleSelect = (code: string) => {
    onValueChange(code);
    setOpen(false);
    setSearch("");
  };

  // Calculate position
  const [position, setPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: align === "end" ? rect.right : rect.left,
        width: rect.width,
      });
    } else {
      setPosition(null);
    }
  }, [open, align]);

  return (
    <div className={cn("relative", className)}>
      <Button
        ref={triggerRef}
        variant="outline"
        role="combobox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn("w-full justify-between cursor-pointer", triggerClassName)}
      >
        <span className="flex items-center gap-2 truncate">
          <span className="text-lg shrink-0">{getCountryFlagEmoji(value)}</span>
          <span className="truncate">{selected?.english_name ?? value}</span>
        </span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && position && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setSearch(""); }} />
          <div
            ref={dropdownRef}
            className="fixed z-50 w-[var(--radix-popover-trigger-width)] rounded-md border bg-popover text-popover-foreground shadow-md"
            style={{
              top: `${position.top}px`,
              left: align === "end" ? "auto" : `${position.left}px`,
              right: align === "end" ? `${window.innerWidth - position.left - position.width}px` : "auto",
              width: `${position.width}px`,
            }}
          >
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search country..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 pr-8 h-9"
                  autoFocus
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No country found.
                </div>
              ) : (
                <div className="p-1">
                  {filtered.map((region) => {
                    const isSelected = value === region.iso_3166_1;
                    return (
                      <button
                        key={region.iso_3166_1}
                        onClick={() => handleSelect(region.iso_3166_1)}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors",
                          isSelected && "bg-accent"
                        )}
                      >
                        <span className="text-lg shrink-0">{getCountryFlagEmoji(region.iso_3166_1)}</span>
                        <span className="flex-1 truncate text-left">{region.english_name}</span>
                        {isSelected && <Check className="h-4 w-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
