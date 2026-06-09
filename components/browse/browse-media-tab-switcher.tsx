"use client";

import { Button } from "@/components/ui/button";

type BrowseMediaTab = "movies" | "tv";

export function BrowseMediaTabSwitcher({
  value,
  onChange,
}: {
  value: BrowseMediaTab;
  onChange: (value: BrowseMediaTab) => void;
}) {
  return (
    <div className="inline-flex shrink-0 rounded-md border border-border/70 p-0.5">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => onChange("movies")}
        className={
          value === "movies"
            ? "h-7 cursor-pointer px-2.5 text-xs bg-muted text-foreground"
            : "h-7 cursor-pointer px-2.5 text-xs"
        }
      >
        Movies
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => onChange("tv")}
        className={
          value === "tv"
            ? "h-7 cursor-pointer px-2.5 text-xs bg-muted text-foreground"
            : "h-7 cursor-pointer px-2.5 text-xs"
        }
      >
        TV Shows
      </Button>
    </div>
  );
}
