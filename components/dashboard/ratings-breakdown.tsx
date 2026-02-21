"use client";

import { useMemo, useState } from "react";
import { BarChart3, Table2, ArrowUp, ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Review {
  rating: number;
}

interface RatingsBreakdownProps {
  reviews: Review[];
}

type SortField = "rating" | "count" | "percentage";
type SortDirection = "asc" | "desc";

export default function RatingsBreakdown({ reviews }: RatingsBreakdownProps) {
  const [viewMode, setViewMode] = useState<"chart" | "table">("chart");
  const [sortField, setSortField] = useState<SortField>("rating");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Calculate rating distribution
  const ratingDistribution = useMemo(() => {
    const distribution = Array.from({ length: 10 }, (_, i) => ({
      rating: i + 1,
      count: 0,
      percentage: 0,
    }));

    reviews.forEach((review) => {
      const rating = review.rating;
      if (rating >= 1 && rating <= 10) {
        distribution[rating - 1].count++;
      }
    });

    const totalReviews = reviews.length;
    if (totalReviews > 0) {
      distribution.forEach((item) => {
        item.percentage = (item.count / totalReviews) * 100;
      });
    }

    return distribution;
  }, [reviews]);

  const maxCount = Math.max(...ratingDistribution.map((r) => r.count), 1);

  // Sort table data
  const sortedDistribution = useMemo(() => {
    const sorted = [...ratingDistribution];
    sorted.sort((a, b) => {
      let comparison = 0;
      if (sortField === "rating") {
        comparison = a.rating - b.rating;
      } else if (sortField === "count") {
        comparison = a.count - b.count;
      } else if (sortField === "percentage") {
        comparison = a.percentage - b.percentage;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
    return sorted;
  }, [ratingDistribution, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  return (
    <div className="space-y-4 mb-8">
      {/* Header with toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Ratings Breakdown</h3>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === "chart" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("chart")}
            className="gap-2"
          >
            <BarChart3 className="h-4 w-4" />
            Chart
          </Button>
          <Button
            variant={viewMode === "table" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("table")}
            className="gap-2"
          >
            <Table2 className="h-4 w-4" />
            Table
          </Button>
        </div>
      </div>

      {/* Chart View */}
      {viewMode === "chart" && (
        <div className="p-6">
          <div className="flex items-end justify-between gap-1">
            {ratingDistribution.map((item) => {
              // Fixed container height in pixels
              const containerHeight = 150;
              // Calculate bar height: (value / maxValue) * containerHeight
              const barHeight = maxCount > 0 ? (item.count / maxCount) * containerHeight : 0;
              const hasRating = item.count > 0;

              return (
                <Tooltip key={item.rating}>
                  <TooltipTrigger asChild>
                    <div className="flex flex-col items-center gap-1.5 flex-1 min-w-0 cursor-pointer group">
                      {/* Bar container - grows upward from number */}
                      <div 
                        className="w-full flex flex-col items-center justify-end"
                        style={{ height: `${containerHeight}px` }}
                      >
                        <div
                          className={cn(
                            "w-full rounded-t transition-all",
                            hasRating
                              ? "bg-blue-500 hover:bg-blue-600"
                              : "bg-muted"
                          )}
                          style={{
                            height: hasRating ? `${barHeight}px` : "2px",
                            minHeight: hasRating ? "4px" : "2px",
                          }}
                        />
                      </div>
                      {/* Number at bottom */}
                      <span className="text-sm font-medium text-foreground">
                        {item.rating}
                      </span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="bg-black/70 backdrop-blur-sm text-white text-[0.8rem] font-medium">
                    <p>
                      {item.count} {item.count === 1 ? "rating" : "ratings"} ({item.percentage.toFixed(1)}%)
                    </p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>
      )}

      {/* Table View */}
      {viewMode === "table" && (
        <div className="border rounded-lg overflow-hidden bg-card">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left px-4 py-3 text-sm font-semibold">
                  <button
                    onClick={() => handleSort("rating")}
                    className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                  >
                    Rating
                    {sortField === "rating" && (
                      sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </button>
                </th>
                <th className="text-right px-4 py-3 text-sm font-semibold">
                  <button
                    onClick={() => handleSort("count")}
                    className="flex items-center gap-1 justify-end w-full hover:text-foreground transition-colors cursor-pointer"
                  >
                    Count
                    {sortField === "count" && (
                      sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </button>
                </th>
                <th className="text-right px-4 py-3 text-sm font-semibold">
                  <button
                    onClick={() => handleSort("percentage")}
                    className="flex items-center gap-1 justify-end w-full hover:text-foreground transition-colors cursor-pointer"
                  >
                    Percentage
                    {sortField === "percentage" && (
                      sortDirection === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                    )}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedDistribution.map((item) => (
                <tr key={item.rating} className="border-b last:border-b-0 hover:bg-muted/50">
                  <td className="px-4 py-3 text-sm font-medium">{item.rating}/10</td>
                  <td className="px-4 py-3 text-sm text-right">{item.count}</td>
                  <td className="px-4 py-3 text-sm text-right text-muted-foreground">
                    {item.percentage.toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
