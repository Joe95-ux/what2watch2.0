"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { X, Star, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  ChannelReview,
  useCreateChannelReview,
  useUpdateChannelReview,
} from "@/hooks/use-youtube-channel-reviews";
import { toast } from "sonner";

interface ChannelReviewFormSheetProps {
  channelId: string;
  channelTitle: string;
  channelThumbnail?: string | null;
  isOpen: boolean;
  onClose: () => void;
  initialReview?: ChannelReview | null;
}

export function ChannelReviewFormSheet({
  channelId,
  channelTitle,
  channelThumbnail,
  isOpen,
  onClose,
  initialReview,
}: ChannelReviewFormSheetProps) {
  const createReview = useCreateChannelReview(channelId);
  const updateReview = useUpdateChannelReview(channelId);
  const [rating, setRating] = useState(initialReview?.rating ?? 5);
  const [title, setTitle] = useState(initialReview?.title ?? "");
  const [content, setContent] = useState(initialReview?.content ?? "");
  const [tags, setTags] = useState<string[]>(initialReview?.tags ?? []);
  const [tagInput, setTagInput] = useState("");

  const mode: "create" | "edit" = initialReview ? "edit" : "create";

  useEffect(() => {
    if (isOpen) {
      setRating(initialReview?.rating ?? 5);
      setTitle(initialReview?.title ?? "");
      setContent(initialReview?.content ?? "");
      setTags(initialReview?.tags ?? []);
      setTagInput("");
    } else {
      setTagInput("");
    }
  }, [isOpen, initialReview]);


  const isSubmitting = createReview.isPending || updateReview.isPending;
  const canSubmit = content.trim().length >= 20 && rating >= 1 && rating <= 5;

  const helperText = useMemo(() => {
    if (content.trim().length === 0) return "Share what makes this channel worth watching.";
    if (content.trim().length < 20) return "Write at least 20 characters.";
    return `${content.trim().length}/1500 characters`;
  }, [content]);

  const handleAddTag = () => {
    const normalized = tagInput.trim();
    if (!normalized) return;
    if (tags.includes(normalized) || tags.length >= 8) {
      setTagInput("");
      return;
    }
    setTags((prev) => [...prev, normalized]);
    setTagInput("");
  };

  const handleTagKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags((prev) => prev.filter((item) => item !== tag));
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit) return;

    try {
      if (mode === "create") {
        await createReview.mutateAsync({
          rating,
          title: title.trim() || null,
          content: content.trim(),
          tags,
        });
        toast.success("Review published.");
      } else if (initialReview) {
        await updateReview.mutateAsync({
          reviewId: initialReview.id,
          data: {
            rating,
            title: title.trim() || null,
            content: content.trim(),
            tags,
          },
        });
        toast.success("Review updated.");
      }
      onClose();
    } catch (error) {
      console.error("[ChannelReviewFormSheet] submit error", error);
      toast.error("Unable to save review.");
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:w-[500px] overflow-y-auto">
        <div className="flex items-start gap-4 border-b border-border pb-6 mb-6">
          {channelThumbnail ? (
            <div className="relative h-16 w-16 overflow-hidden rounded-full border border-border">
              <Image
                src={channelThumbnail}
                alt={channelTitle}
                fill
                className="object-cover"
                sizes="64px"
                unoptimized
              />
            </div>
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border text-lg font-semibold">
              {channelTitle.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <p className="text-sm uppercase tracking-wide text-muted-foreground">
              {mode === "create" ? "Write a review" : "Edit your review"}
            </p>
            <h2 className="text-2xl font-bold leading-tight">{channelTitle}</h2>
            <p className="text-sm text-muted-foreground">Share your experience with this channel.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col space-y-6">
            <div className="space-y-3">
              <Label>Rating</Label>
              <div className="flex items-center gap-2">
                {Array.from({ length: 5 }).map((_, index) => {
                  const value = index + 1;
                  return (
                    <Button
                      key={value}
                      type="button"
                      variant={value <= rating ? "default" : "outline"}
                      size="icon"
                      className={cn(
                        "h-10 w-10 shrink-0 cursor-pointer rounded-full",
                        value <= rating ? "bg-primary text-primary-foreground" : ""
                      )}
                      onClick={() => setRating(value)}
                    >
                      <Star
                        className={cn(
                          "h-5 w-5",
                          value <= rating ? "fill-current" : "text-muted-foreground"
                        )}
                      />
                    </Button>
                  );
                })}
                <span className="text-sm font-medium text-muted-foreground">{rating}/5</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="channel-review-title">Title (optional)</Label>
              <Input
                id="channel-review-title"
                placeholder="Summarize your review..."
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={120}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="channel-review-content">Review</Label>
                <span className="text-xs text-muted-foreground">{helperText}</span>
              </div>
              <Textarea
                id="channel-review-content"
                value={content}
                onChange={(event) => setContent(event.target.value.slice(0, 1500))}
                className="min-h-[220px] resize-none"
                placeholder="What do you like about this channel? What should others expect?"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Tags (optional)</Label>
                <span className="text-xs text-muted-foreground">
                  Up to 8 tags. Press Enter to add.
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="flex items-center gap-1 rounded-full px-3 py-1 text-xs"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="cursor-pointer text-muted-foreground hover:text-foreground"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
                {tags.length < 8 && (
                  <div className="flex items-center gap-2 rounded-full border border-dashed border-border px-3 py-1">
                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(event) => setTagInput(event.target.value)}
                      onKeyDown={handleTagKeyDown}
                      placeholder="Add tag"
                      className="bg-transparent text-xs outline-none placeholder:text-muted-foreground"
                      maxLength={24}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border-t border-border pt-6 space-y-3">
            <Button
              type="submit"
              disabled={!canSubmit || isSubmitting}
              className="w-full cursor-pointer"
            >
              {isSubmitting ? "Saving..." : mode === "create" ? "Publish review" : "Update review"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="w-full cursor-pointer"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}


