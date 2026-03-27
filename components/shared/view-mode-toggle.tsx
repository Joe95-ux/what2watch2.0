"use client";

import { Button } from "@/components/ui/button";
import { AlignJustify, List } from "lucide-react";
import { BiSolidGrid } from "react-icons/bi";

export type ViewMode = "grid" | "table" | "detailed";

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function ViewModeToggle({ viewMode, onViewModeChange }: ViewModeToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onViewModeChange("grid")}
        title="Grid view"
        className={`cursor-pointer rounded-full border ${
          viewMode === "grid"
            ? "border-primary bg-muted text-foreground"
            : "border-border hover:bg-muted"
        }`}
      >
        <BiSolidGrid className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onViewModeChange("table")}
        title="List view"
        className={`cursor-pointer rounded-full border ${
          viewMode === "table"
            ? "border-primary bg-muted text-foreground"
            : "border-border hover:bg-muted"
        }`}
      >
        <AlignJustify className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onViewModeChange("detailed")}
        title="Detailed view"
        className={`cursor-pointer rounded-full border ${
          viewMode === "detailed"
            ? "border-primary bg-muted text-foreground"
            : "border-border hover:bg-muted"
        }`}
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );
}

