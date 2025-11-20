"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useReviews } from "@/hooks/use-reviews";
import { useMovieDetails, useTVDetails } from "@/hooks/use-content-details";
import ReviewCard from "@/components/reviews/review-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ChevronLeft, ChevronRight } from "lucide-react";
import WriteReviewDialog from "@/components/reviews/write-review-dialog";
import { useUser } from "@clerk/nextjs";
import { ArrowLeft } from "lucide-react";

export default function ReviewsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useUser();
  const [writeDialogOpen, setWriteDialogOpen] = useState(false);
  const [ratingFilter, setRatingFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("featured");
  const [page, setPage] = useState(1);

  const type = params.type as "movie" | "tv";
  const id = parseInt(params.id as string, 10);

  const { data: movieDetails } = useMovieDetails(type === "movie" ? id : null);
  const { data: tvDetails } = useTVDetails(type === "tv" ? id : null);
  const details = type === "movie" ? movieDetails : tvDetails;

  const { data, isLoading } = useReviews(id, type, {
    rating: ratingFilter !== "all" ? parseInt(ratingFilter, 10) : null,
    sortBy,
    page,
    limit: 20,
  });

  const reviews = data?.reviews || [];
  const pagination = data?.pagination || {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Scroll to review if hash is present in URL
  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const reviewId = window.location.hash.replace("#review-", "");
      if (reviewId) {
        // Wait for reviews to load, then scroll
        if (reviews.length > 0) {
          setTimeout(() => {
            const element = document.getElementById(`review-${reviewId}`);
            if (element) {
              element.scrollIntoView({ behavior: "smooth", block: "start" });
            }
          }, 100);
        }
      }
    }
  }, [reviews]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="mb-6 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold">
            Reviews ({pagination.total})
          </h1>
          {user && (
            <Button onClick={() => setWriteDialogOpen(true)} className="cursor-pointer">
              Write a Review
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Filter by Rating:</label>
            <Select value={ratingFilter} onValueChange={setRatingFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Ratings</SelectItem>
                <SelectItem value="10">10/10</SelectItem>
                <SelectItem value="9">9/10</SelectItem>
                <SelectItem value="8">8/10</SelectItem>
                <SelectItem value="7">7/10</SelectItem>
                <SelectItem value="6">6/10</SelectItem>
                <SelectItem value="5">5/10</SelectItem>
                <SelectItem value="4">4/10</SelectItem>
                <SelectItem value="3">3/10</SelectItem>
                <SelectItem value="2">2/10</SelectItem>
                <SelectItem value="1">1/10</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Sort by:</label>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="featured">Featured</SelectItem>
                <SelectItem value="date">Review Date</SelectItem>
                <SelectItem value="rating">Rating</SelectItem>
                <SelectItem value="helpful">Most Helpful</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Reviews */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-lg" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center text-muted-foreground py-12 border border-border rounded-lg">
            <p className="text-sm mb-4">No reviews found</p>
            {user && (
              <Button
                variant="outline"
                onClick={() => setWriteDialogOpen(true)}
                className="cursor-pointer"
              >
                Be the first to review
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-8">
              {reviews.map((review) => (
                <ReviewCard key={review.id} review={review} showFullContent />
              ))}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="mt-6">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(page - 1)}
                        disabled={page === 1}
                        className="gap-1 cursor-pointer"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                      </Button>
                    </PaginationItem>

                    {(() => {
                      const pages: (number | "ellipsis")[] = [];
                      
                      // Always show first page
                      pages.push(1);
                      
                      // Add ellipsis if needed
                      if (page > 3) {
                        pages.push("ellipsis");
                      }
                      
                      // Add pages around current
                      for (let i = Math.max(2, page - 1); i <= Math.min(pagination.totalPages - 1, page + 1); i++) {
                        if (i !== 1 && i !== pagination.totalPages) {
                          pages.push(i);
                        }
                      }
                      
                      // Add ellipsis if needed
                      if (page < pagination.totalPages - 2) {
                        pages.push("ellipsis");
                      }
                      
                      // Always show last page
                      if (pagination.totalPages > 1) {
                        pages.push(pagination.totalPages);
                      }
                      
                      // Remove duplicates
                      const uniquePages = pages.filter((p, index, self) => {
                        if (p === "ellipsis") {
                          return index === self.indexOf("ellipsis") || 
                                 (index > 0 && self[index - 1] !== "ellipsis");
                        }
                        return index === self.findIndex((page) => page === p);
                      });
                      
                      return uniquePages.map((p, index) => {
                        if (p === "ellipsis") {
                          return (
                            <PaginationItem key={`ellipsis-${index}`}>
                              <span className="px-2">...</span>
                            </PaginationItem>
                          );
                        }
                        return (
                          <PaginationItem key={p}>
                            <PaginationLink
                              onClick={(e) => {
                                e.preventDefault();
                                handlePageChange(p);
                              }}
                              isActive={page === p}
                              className="cursor-pointer"
                            >
                              {p}
                            </PaginationLink>
                          </PaginationItem>
                        );
                      });
                    })()}

                    <PaginationItem>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(page + 1)}
                        disabled={page === pagination.totalPages}
                        className="gap-1 cursor-pointer"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}

        {user && (
          <WriteReviewDialog
            isOpen={writeDialogOpen}
            onClose={() => setWriteDialogOpen(false)}
            tmdbId={id}
            mediaType={type}
            filmData={
              details
                ? {
                    title:
                      type === "movie"
                        ? (details as any).title
                        : (details as any).name,
                    posterPath: details.poster_path || null,
                    releaseYear:
                      type === "movie"
                        ? details.release_date
                          ? new Date(details.release_date).getFullYear().toString()
                          : null
                        : details.first_air_date
                        ? new Date(details.first_air_date).getFullYear().toString()
                        : null,
                    runtime:
                      type === "movie"
                        ? details.runtime
                          ? `${Math.floor(details.runtime / 60)}h ${details.runtime % 60}m`
                          : null
                        : details.episode_run_time &&
                          details.episode_run_time.length > 0
                        ? (() => {
                            const avg = Math.round(
                              details.episode_run_time.reduce(
                                (a: number, b: number) => a + b,
                                0
                              ) / details.episode_run_time.length
                            );
                            return `${Math.floor(avg / 60)}h ${avg % 60}m`;
                          })()
                        : null,
                    rating:
                      (details as any).vote_average > 0
                        ? (details as any).vote_average
                        : null,
                  }
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
}

