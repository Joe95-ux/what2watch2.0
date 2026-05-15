"use client";

import { GroupedPagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

type YouTubeTabPaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
};

/** Grouped pagination aligned to the right (matches channel sidebar tab layouts). */
export function YouTubeTabPagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: YouTubeTabPaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className={cn("flex justify-end pt-4 border-t", className)}>
      <GroupedPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        className="mt-0"
      />
    </div>
  );
}
