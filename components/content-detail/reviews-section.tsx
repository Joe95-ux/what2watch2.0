"use client";

import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ReviewsSectionProps {
  tmdbId: number;
  mediaType: "movie" | "tv";
}

export default function ReviewsSection({ tmdbId, mediaType }: ReviewsSectionProps) {
  // TODO: Implement reviews API integration
  // For now, show placeholder
  return (
    <section className="py-12">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Reviews</h2>
        <Button>Write a Review</Button>
      </div>

      <div className="text-center text-muted-foreground py-12 border border-border rounded-lg">
        <p className="text-sm">Reviews feature coming soon</p>
      </div>
    </section>
  );
}

interface Review {
  id: string;
  username: string;
  rating: number;
  title: string;
  content: string;
  date: string;
  likes: number;
  replies: number;
}

// Review Card Component (for future use)
function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
          <span className="text-sm font-medium">
            {review.username[0].toUpperCase()}
          </span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <p className="font-semibold">{review.username}</p>
            <span className="text-sm text-muted-foreground">•</span>
            <span className="text-sm text-muted-foreground">{review.date}</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "h-4 w-4",
                  i < Math.floor(review.rating / 2)
                    ? "text-yellow-400 fill-yellow-400"
                    : "text-muted-foreground"
                )}
              />
            ))}
            <span className="text-sm font-medium">{review.rating}/10</span>
          </div>
        </div>
      </div>

      <h3 className="font-semibold mb-2">{review.title}</h3>
      <p className="text-muted-foreground mb-4">{review.content}</p>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm">
          👍 {review.likes}
        </Button>
        <Button variant="ghost" size="sm">
          💬 {review.replies}
        </Button>
        <Button variant="ghost" size="sm">
          Reply
        </Button>
      </div>
    </div>
  );
}

