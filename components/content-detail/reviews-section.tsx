"use client";

import { Button } from "@/components/ui/button";
import { useReviews, useTMDBReviews } from "@/hooks/use-reviews";
import ReviewCard from "@/components/reviews/review-card";
import TMDBReviewCard from "@/components/reviews/tmdb-review-card";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import WriteReviewDialog from "@/components/reviews/write-review-dialog";
import { useState } from "react";
import { useUser } from "@clerk/nextjs";

interface ReviewsSectionProps {
  tmdbId: number;
  mediaType: "movie" | "tv";
  filmData?: {
    title: string;
    posterPath: string | null;
    releaseYear: string | null;
    runtime: string | null;
    rating: number | null;
  };
}

export default function ReviewsSection({
  tmdbId,
  mediaType,
  filmData,
}: ReviewsSectionProps) {
  const router = useRouter();
  const { user } = useUser();
  const [writeDialogOpen, setWriteDialogOpen] = useState(false);
  
  // Fetch user reviews
  const { data: userReviewsData, isLoading: userReviewsLoading } = useReviews(tmdbId, mediaType, {
    sortBy: "featured",
    limit: 3,
  });

  // Fetch TMDB reviews (show top 2)
  const { data: tmdbReviewsData, isLoading: tmdbReviewsLoading } = useTMDBReviews(tmdbId, mediaType, 1);

  const userReviews = userReviewsData?.reviews || [];
  const totalUserReviews = userReviewsData?.pagination.total || 0;
  const tmdbReviews = tmdbReviewsData?.results?.slice(0, 2) || [];
  const totalTMDBReviews = tmdbReviewsData?.total_results || 0;

  const isLoading = userReviewsLoading || tmdbReviewsLoading;
  const hasAnyReviews = userReviews.length > 0 || tmdbReviews.length > 0;
  const totalReviews = totalUserReviews + totalTMDBReviews;

  return (
    <section className="py-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">
          Reviews {totalReviews > 0 && `(${totalReviews})`}
        </h2>
        {user && (
          <Button onClick={() => setWriteDialogOpen(true)} className="cursor-pointer">
            Write a Review
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </div>
      ) : !hasAnyReviews ? (
        <div className="text-center text-muted-foreground py-12 border border-border rounded-lg">
          <p className="text-sm mb-4">No reviews yet</p>
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
          <div className="space-y-4 mb-6">
            {/* Show TMDB reviews first */}
            {tmdbReviews.length > 0 && (
              <>
                {tmdbReviews.map((review) => (
                  <TMDBReviewCard key={review.id} review={review} />
                ))}
              </>
            )}
            
            {/* Then show user reviews */}
            {userReviews.length > 0 && (
              <>
                {userReviews.map((review) => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </>
            )}
          </div>
          
          {(totalUserReviews > 3 || totalTMDBReviews > 2) && (
            <div className="text-center">
              <Button
                variant="outline"
                onClick={() =>
                  router.push(`/content/${mediaType}/${tmdbId}/reviews`)
                }
                className="cursor-pointer"
              >
                View All Reviews
              </Button>
            </div>
          )}
        </>
      )}

      {user && (
        <WriteReviewDialog
          isOpen={writeDialogOpen}
          onClose={() => setWriteDialogOpen(false)}
          tmdbId={tmdbId}
          mediaType={mediaType}
          filmData={filmData}
        />
      )}
    </section>
  );
}


