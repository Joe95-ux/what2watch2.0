"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { generatePageNumbers } from "@/lib/pagination-utils";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pageNumbers = generatePageNumbers(currentPage, totalPages);

  return (
    <div className="flex items-center justify-center gap-2 mt-6 w-full overflow-auto px-2 py-1">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="flex-shrink-0 cursor-pointer"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Previous
      </Button>
      <div className="flex items-center gap-1 overflow-x-auto">
        {pageNumbers.map((page, index) => {
          if (page === "ellipsis") {
            return (
              <span key={`ellipsis-${index}`} className="text-muted-foreground px-2">
                ...
              </span>
            );
          }
          return (
            <Button
              key={page}
              variant={currentPage === page ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(page)}
              className="min-w-[40px] flex-shrink-0 cursor-pointer"
            >
              {page}
            </Button>
          );
        })}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="flex-shrink-0 cursor-pointer"
      >
        Next
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  );
}
