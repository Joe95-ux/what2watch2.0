"use client";

import { Button } from "@/components/ui/button";
import { Copy, Move, Trash2 } from "lucide-react";

interface BulkActionsBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onCopy: () => void;
  onMove: () => void;
  onDelete: () => void;
  isAllSelected: boolean;
}

export function BulkActionsBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onCopy,
  onMove,
  onDelete,
  isAllSelected,
}: BulkActionsBarProps) {
  return (
    <div className="container max-w-7xl mx-auto mt-[1rem] px-4 sm:px-6 lg:px-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 py-4 border-b border-border bg-muted/30 rounded-lg px-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={onSelectAll}
            className="cursor-pointer w-full sm:w-auto"
          >
            <div className="h-4 w-4 mr-2 flex items-center justify-center">
              {isAllSelected ? (
                <div className="h-4 w-4 border-2 border-current rounded bg-current" />
              ) : (
                <div className="h-4 w-4 border-2 border-current rounded" />
              )}
            </div>
            {isAllSelected ? "Deselect All" : "Select All"}
          </Button>
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {selectedCount} of {totalCount} selected
          </span>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={onCopy}
            disabled={selectedCount === 0}
            className="cursor-pointer w-full sm:w-auto"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy ({selectedCount})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onMove}
            disabled={selectedCount === 0}
            className="cursor-pointer w-full sm:w-auto"
          >
            <Move className="h-4 w-4 mr-2" />
            Move ({selectedCount})
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={onDelete}
            disabled={selectedCount === 0}
            className="cursor-pointer w-full sm:w-auto"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete ({selectedCount})
          </Button>
        </div>
      </div>
    </div>
  );
}

