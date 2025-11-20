"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X, Star, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useCreateReview } from "@/hooks/use-reviews";
import { toast } from "sonner";
import { getPosterUrl } from "@/lib/tmdb";

interface WriteReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
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

export default function WriteReviewDialog({
  isOpen,
  onClose,
  tmdbId,
  mediaType,
  filmData,
}: WriteReviewDialogProps) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [containsSpoilers, setContainsSpoilers] = useState<"yes" | "no">("no");
  const [isVisible, setIsVisible] = useState(false);
  const createReview = useCreateReview();

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setRating(5);
      setTitle("");
      setContent("");
      setContainsSpoilers("no");
    }
  }, [isOpen]);

  // Handle visibility for smooth transitions
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error("Review content is required");
      return;
    }

    if (rating < 1 || rating > 10) {
      toast.error("Rating must be between 1 and 10");
      return;
    }

    try {
      await createReview.mutateAsync({
        tmdbId,
        mediaType,
        rating,
        title: title.trim() || undefined,
        content: content.trim(),
        containsSpoilers: containsSpoilers === "yes",
      });
      toast.success("Review submitted successfully");
      onClose();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit review"
      );
    }
  };

  const filmTitle = filmData?.title || (mediaType === "movie" ? "Movie" : "TV Show");
  const posterPath = filmData?.posterPath;
  const releaseYear = filmData?.releaseYear;
  const runtime = filmData?.runtime;
  const filmRating = filmData?.rating;

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ease-in-out",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          "fixed right-0 top-0 h-full w-full sm:w-[500px] bg-background border-l border-border z-50 shadow-2xl",
          "transform transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-start gap-4 p-6 border-b border-border">
            {posterPath && (
              <div className="relative w-16 h-24 rounded overflow-hidden flex-shrink-0">
                <Image
                  src={getPosterUrl(posterPath, "w300")}
                  alt={filmTitle}
                  fill
                  className="object-cover"
                  unoptimized
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-bold line-clamp-2">{filmTitle}</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 flex-wrap">
                  {filmRating && (
                    <>
                      <span className="font-medium text-foreground">{filmRating.toFixed(1)}</span>
                      <span>•</span>
                    </>
                  )}
                  {releaseYear && <span>{releaseYear}</span>}
                  {runtime && (
                    <>
                      <span>•</span>
                      <span>{runtime}</span>
                    </>
                  )}
                </div>
                <div className="text-xs font-medium text-muted-foreground mt-1">
                  User Review
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <div className="space-y-2">
                <Label>Rating (1-10)</Label>
                <div className="flex items-center gap-2">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setRating(i + 1)}
                      className="cursor-pointer"
                    >
                      <Star
                        className={cn(
                          "h-6 w-6 transition-colors",
                          i < rating
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-muted-foreground"
                        )}
                      />
                    </button>
                  ))}
                  <span className="ml-2 font-medium">{rating}/10</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title (Optional)</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Give your review a title..."
                  maxLength={100}
                />
              </div>

              <div className="space-y-2 flex-1 flex flex-col min-h-0">
                <Label htmlFor="content">Review *</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your review here..."
                  className="flex-1 min-h-[300px] resize-none"
                  required
                  maxLength={5000}
                />
                <p className="text-sm text-muted-foreground">
                  {content.length}/5000 characters
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label>Does your review contain spoilers?</Label>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 cursor-pointer"
                      >
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>What is a spoiler?</AlertDialogTitle>
                        <AlertDialogDescription>
                          A spoiler is information that reveals important plot details, twists, 
                          endings, or key story elements that could ruin the viewing experience 
                          for others who haven&apos;t seen the content yet. If your review mentions 
                          specific plot points, character deaths, surprise endings, or major 
                          revelations, please mark it as containing spoilers.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogAction>Got it</AlertDialogAction>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                <div className="border border-input rounded-md p-4 space-y-4">
                  <RadioGroup
                    value={containsSpoilers}
                    onValueChange={(value) => setContainsSpoilers(value as "yes" | "no")}
                  >
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="yes" id="spoilers-yes" className="h-5 w-5" />
                      <Label htmlFor="spoilers-yes" className="font-normal cursor-pointer text-base">
                        Yes
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <RadioGroupItem value="no" id="spoilers-no" className="h-5 w-5" />
                      <Label htmlFor="spoilers-no" className="font-normal cursor-pointer text-base">
                        No
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-border p-6 space-y-3">
              <Button
                type="submit"
                disabled={createReview.isPending || !content.trim()}
                className="w-full cursor-pointer"
              >
                {createReview.isPending ? "Submitting..." : "Submit Review"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="w-full cursor-pointer"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
