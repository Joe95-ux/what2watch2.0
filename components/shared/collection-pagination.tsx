"use client";

import { GroupedPagination } from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

interface CollectionPaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function CollectionPagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: CollectionPaginationProps) {
  return (
    <GroupedPagination
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={onPageChange}
      className={cn("mt-8", className)}
    />
  );
}
