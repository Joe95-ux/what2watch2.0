"use client";

import { Button } from "@/components/ui/button";
import { Grid3x3, Table2, List } from "lucide-react";

export type ViewMode = "grid" | "table" | "detailed";

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export function ViewModeToggle({ viewMode, onViewModeChange }: ViewModeToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <Button
        variant={viewMode === "grid" ? "default" : "outline"}
        size="sm"
        onClick={() => onViewModeChange("grid")}
        className="cursor-pointer"
      >
        <Grid3x3 className="h-4 w-4 mr-2" />
        Grid
      </Button>
      <Button
        variant={viewMode === "table" ? "default" : "outline"}
        size="sm"
        onClick={() => onViewModeChange("table")}
        className="cursor-pointer"
      >
        <Table2 className="h-4 w-4 mr-2" />
        Table
      </Button>
      <Button
        variant={viewMode === "detailed" ? "default" : "outline"}
        size="sm"
        onClick={() => onViewModeChange("detailed")}
        className="cursor-pointer"
      >
        <List className="h-4 w-4 mr-2" />
        Detailed
      </Button>
    </div>
  );
}

