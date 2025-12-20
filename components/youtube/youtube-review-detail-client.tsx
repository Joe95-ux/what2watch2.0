"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { ArrowLeft, Star, ThumbsUp, ThumbsDown, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ChannelReviewCard } from "./channel-review-card";
import { useToggleChannelReviewVote } from "@/hooks/use-youtube-channel-reviews";
import { useUser, useClerk } from "@clerk/nextjs";
import { toast } from "sonner";
import { getChannelProfilePath } from "@/lib/channel-path";
import Link from "next/link";

interface ReviewDetail {
  id: string;
  channelId: string;
  channelTitle: string | null;
  channelThumbnail: string | null;
  channelSlug: string | null;
  rating: number;
  title: string | null;
  content: string;
  tags: string[];
  helpfulCount: number;
  notHelpfulCount?: number;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  userId: string;
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
  viewerHasVoted: boolean;
  viewerVoteType?: "UP" | "DOWN" | null;
  canEdit: boolean;
}

interface YouTubeReviewDetailClientProps {
  reviewId: string;
}

export function YouTubeReviewDetailClient({ reviewId }: YouTubeReviewDetailClientProps) {
  const router = useRouter();
  const { isSignedIn } = useUser();
  const { openSignIn } = useClerk();

  const { data: review, isLoading } = useQuery<ReviewDetail>({
    queryKey: ["youtube-review-detail", reviewId],
    queryFn: async () => {
      const response = await fetch(`/api/youtube/channel-reviews/${reviewId}`);
      if (!response.ok) throw new Error("Failed to fetch review");
      return response.json();
    },
  });

  const toggleVote = useToggleChannelReviewVote(review?.channelId || "");

  const handleVote = async (voteType: "UP" | "DOWN") => {
    if (!isSignedIn) {
      toast.error("Sign in to vote");
      if (openSignIn) {
        openSignIn({
          afterSignInUrl: typeof window !== "undefined" ? window.location.href : undefined,
        });
      }
      return;
    }

    if (!review) return;

    try {
      await toggleVote.mutateAsync({ reviewId: review.id, voteType });
      const currentVoteType = review.viewerVoteType;
      if (currentVoteType === voteType) {
        toast.success("Vote removed");
      } else {
        toast.success(voteType === "UP" ? "Helpful vote added" : "Not helpful vote added");
      }
    } catch (error: unknown) {
      console.error("[ReviewDetail] vote error", error);
      if (error && typeof error === "object" && "code" in error && error.code === "OWNER_CANNOT_VOTE") {
        toast.info("You cannot vote on your own review");
      } else {
        toast.error("Unable to update vote");
      }
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Skeleton className="h-10 w-32 mb-6" />
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Button variant="ghost" onClick={() => router.back()} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="rounded-2xl border border-dashed border-border p-10 text-center">
            <p className="text-muted-foreground">Review not found.</p>
          </div>
        </div>
      </div>
    );
  }

  const displayName = review.user.username || review.user.displayName || "Anonymous";
  const channelPath = getChannelProfilePath(review.channelId, review.channelSlug);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => router.back()} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* Review Card */}
        <div className="rounded-2xl border border-border bg-card/60 p-6 shadow-sm backdrop-blur">
          <div className="flex items-start gap-4 mb-6">
            <Avatar className="h-12 w-12">
              {review.user.avatarUrl ? (
                <AvatarImage src={review.user.avatarUrl} alt={displayName} />
              ) : (
                <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
              )}
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <p className="font-semibold">{displayName}</p>
                <span className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                </span>
                {review.isEdited && (
                  <span className="text-xs text-muted-foreground">(edited)</span>
                )}
              </div>

              {/* Channel Link */}
              <Link
                href={channelPath}
                className="text-sm text-primary hover:underline mb-3 inline-block"
              >
                {review.channelTitle || "Channel"}
              </Link>

              {/* Rating */}
              <div className="flex items-center gap-2 mb-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Star
                    key={index}
                    className={`h-4 w-4 ${
                      index < review.rating
                        ? "fill-yellow-500 text-yellow-500"
                        : "text-muted-foreground"
                    }`}
                  />
                ))}
                <span className="text-sm font-medium text-muted-foreground">
                  {review.rating}/5
                </span>
              </div>
            </div>
          </div>

          {review.title && (
            <h2 className="text-2xl font-bold mb-4">{review.title}</h2>
          )}

          <p className="text-base leading-relaxed text-foreground whitespace-pre-wrap mb-4">
            {review.content}
          </p>

          {review.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mb-6">
              <Tag className="h-4 w-4 text-muted-foreground" />
              {review.tags.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs font-medium capitalize bg-muted/70"
                >
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 pt-4 border-t">
            <Button
              variant={review.viewerVoteType === "UP" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleVote("UP")}
              disabled={toggleVote.isPending}
              className="gap-2"
            >
              <ThumbsUp className="h-4 w-4" />
              Helpful
              <span className="text-xs font-medium text-muted-foreground">
                {review.helpfulCount}
              </span>
            </Button>
            <Button
              variant={review.viewerVoteType === "DOWN" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => handleVote("DOWN")}
              disabled={toggleVote.isPending}
              className="gap-2"
            >
              <ThumbsDown className="h-4 w-4" />
              Not Helpful
              <span className="text-xs font-medium text-muted-foreground">
                {review.notHelpfulCount ?? 0}
              </span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

