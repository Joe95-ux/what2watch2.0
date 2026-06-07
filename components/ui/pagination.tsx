"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { generatePageNumbers } from "@/lib/pagination-utils";

// Simple Pagination component (for lists page)
interface SimplePaginationProps {
  currentPage: number;
  totalPages: number;
  origin?: string;
  onPageChange: (page: number) => void;
}

const groupedPageButtonClass =
  "h-9 min-w-9 rounded-none border-0 border-r border-border px-3 shadow-none cursor-pointer disabled:cursor-not-allowed disabled:opacity-50";

/** Full page-number pagination with connected (grouped) buttons. */
export function GroupedPagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  showLabels = false,
}: SimplePaginationProps & { className?: string; showLabels?: boolean }) {
  if (totalPages <= 1) return null;

  const pageNumbers = generatePageNumbers(currentPage, totalPages);

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 sm:flex-row sm:justify-center w-full overflow-auto px-2 py-1",
        className
      )}
      role="navigation"
      aria-label="Pagination"
    >
      <div
        className="inline-flex items-stretch overflow-hidden rounded-[10px] border border-border bg-background"
        role="group"
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className={cn(
            groupedPageButtonClass,
            "rounded-l-[10px]",
            showLabels ? "pr-3 pl-2.5" : "px-2.5"
          )}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4 shrink-0" />
          {showLabels ? <span className="ml-1">Previous</span> : null}
        </Button>
        {pageNumbers.map((page, index) => {
          if (page === "ellipsis") {
            return (
              <span
                key={`ellipsis-${index}`}
                className="inline-flex h-9 min-w-9 items-center justify-center border-r border-border px-2 text-sm text-muted-foreground"
                aria-hidden
              >
                …
              </span>
            );
          }
          const isActive = currentPage === page;
          return (
            <Button
              key={page}
              type="button"
              variant={isActive ? "secondary" : "ghost"}
              size="sm"
              onClick={() => onPageChange(page)}
              className={cn(
                groupedPageButtonClass,
                isActive && "bg-muted font-semibold text-foreground hover:bg-muted"
              )}
              aria-label={`Page ${page}`}
              aria-current={isActive ? "page" : undefined}
            >
              {page}
            </Button>
          );
        })}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className={cn(
            groupedPageButtonClass,
            "rounded-r-[10px] border-r-0",
            showLabels ? "pl-2.5 pr-3" : "px-2.5"
          )}
          aria-label="Next page"
        >
          {showLabels ? <span className="mr-1">Next</span> : null}
          <ChevronRight className="h-4 w-4 shrink-0" />
        </Button>
      </div>
    </div>
  );
}

/** @deprecated Prefer GroupedPagination — kept for existing imports. */
export function SimplePagination({
  currentPage,
  totalPages,
  onPageChange,
  origin,
}: SimplePaginationProps) {
  return (
    <GroupedPagination
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={onPageChange}
      className="mt-6"
      showLabels={origin !== "traffic"}
    />
  );
}

// Shadcn-style pagination components (for other pages)
const PaginationRoot = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex items-center justify-center", className)}
    {...props}
  />
));
PaginationRoot.displayName = "Pagination";

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-row items-center gap-1", className)}
    {...props}
  />
));
PaginationContent.displayName = "PaginationContent";

const PaginationItem = React.forwardRef<
  HTMLLIElement,
  React.HTMLAttributes<HTMLLIElement>
>(({ className, ...props }, ref) => (
  <li ref={ref} className={cn("", className)} {...props} />
));
PaginationItem.displayName = "PaginationItem";

interface PaginationLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  isActive?: boolean;
}

const PaginationLink = React.forwardRef<
  HTMLAnchorElement,
  PaginationLinkProps
>(({ className, isActive, ...props }, ref) => (
  <a
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
      isActive
        ? "bg-primary text-primary-foreground"
        : "hover:bg-accent hover:text-accent-foreground",
      className
    )}
    {...props}
  />
));
PaginationLink.displayName = "PaginationLink";

const PaginationPrevious = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement>
>(({ className, ...props }, ref) => (
  <a
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground",
      className
    )}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
    <span className="sr-only">Previous page</span>
  </a>
));
PaginationPrevious.displayName = "PaginationPrevious";

const PaginationNext = React.forwardRef<
  HTMLAnchorElement,
  React.AnchorHTMLAttributes<HTMLAnchorElement>
>(({ className, ...props }, ref) => (
  <a
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 hover:bg-accent hover:text-accent-foreground",
      className
    )}
    {...props}
  >
    <span className="sr-only">Next page</span>
    <ChevronRight className="h-4 w-4" />
  </a>
));
PaginationNext.displayName = "PaginationNext";

const PaginationEllipsis = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </div>
));
PaginationEllipsis.displayName = "PaginationEllipsis";

// Export all components
// Export PaginationRoot as Pagination for shadcn-style usage
// Note: SimplePagination is already exported above as a function
export {
  PaginationRoot,
  PaginationRoot as Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
};
