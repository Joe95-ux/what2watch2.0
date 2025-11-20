"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateReview } from "@/hooks/use-reviews";
import { toast } from "sonner";

interface WriteReviewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tmdbId: number;
  mediaType: "movie" | "tv";
}

export default function WriteReviewDialog({
  isOpen,
  onClose,
  tmdbId,
  mediaType,
}: WriteReviewDialogProps) {
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const createReview = useCreateReview();

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
      });
      toast.success("Review submitted successfully");
      onClose();
      setRating(5);
      setTitle("");
      setContent("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to submit review"
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Write a Review</DialogTitle>
          <DialogDescription>
            Share your thoughts about this {mediaType === "movie" ? "movie" : "TV show"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
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

            <div className="space-y-2">
              <Label htmlFor="content">Review *</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write your review here..."
                rows={8}
                required
                maxLength={5000}
              />
              <p className="text-sm text-muted-foreground">
                {content.length}/5000 characters
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="cursor-pointer">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createReview.isPending || !content.trim()}
              className="cursor-pointer"
            >
              {createReview.isPending ? "Submitting..." : "Submit Review"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

