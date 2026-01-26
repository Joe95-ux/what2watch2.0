"use client";

import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Image from "next/image";
import { Star, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { cn } from "@/lib/utils";
import {
  ChannelReview,
  useCreateChannelReview,
  useUpdateChannelReview,
} from "@/hooks/use-youtube-channel-reviews";
import { toast } from "sonner";
import { sanitizeHtml } from "@/lib/moderation";

// Helper function to sanitize HTML in Zod transforms
const sanitizeString = (val: string | null | undefined): string => {
  if (!val) return "";
  return sanitizeHtml(val.trim());
};

// Zod schema for form validation with HTML sanitization
const channelReviewSchema = z.object({
  rating: z
    .number()
    .min(1, "Rating is required")
    .max(5, "Rating must be between 1 and 5")
    .int("Rating must be a whole number"),
  title: z
    .union([z.string().max(120, "Title must be 120 characters or less"), z.null()])
    .transform((val) => {
      if (!val) return null;
      const sanitized = sanitizeString(val);
      return sanitized.length > 0 ? sanitized : null;
    })
    .pipe(z.string().max(120).nullable()),
  content: z
    .string()
    .transform((val) => sanitizeString(val))
    .refine(
      (val) => val.length >= 20,
      "Review must be at least 20 characters after sanitization"
    )
    .refine(
      (val) => val.length <= 1500,
      "Review must be 1500 characters or less"
    ),
  tags: z
    .array(
      z
        .string()
        .min(1)
        .max(24)
        .transform((val) => sanitizeString(val).slice(0, 24))
    )
    .max(8, "Maximum 8 tags allowed"),
});

type ChannelReviewFormValues = z.infer<typeof channelReviewSchema>;

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
  const mode: "create" | "edit" = initialReview ? "edit" : "create";

  const form = useForm<ChannelReviewFormValues>({
    resolver: zodResolver(channelReviewSchema),
    defaultValues: {
      rating: 0,
      title: null,
      content: "",
      tags: [],
    },
    mode: "onChange",
  });

  const { watch, setValue, reset } = form;
  const content = watch("content");
  const tags = watch("tags");
  const [tagInput, setTagInput] = useState("");

  // Reset form when sheet opens/closes or initialReview changes
  useEffect(() => {
    if (isOpen) {
      reset({
        rating: initialReview?.rating ?? 0,
        title: initialReview?.title ?? null,
        content: initialReview?.content ?? "",
        tags: initialReview?.tags ?? [],
      });
      setTagInput("");
    } else {
      reset();
      setTagInput("");
    }
  }, [isOpen, initialReview, reset]);

  const isSubmitting = createReview.isPending || updateReview.isPending;

  const handleAddTag = () => {
    const normalized = tagInput.trim();
    if (!normalized) return;
    
    // Validate tag length
    if (normalized.length > 24) {
      toast.error("Tag must be 24 characters or less");
      return;
    }
    
    // Check for duplicates
    if (tags.includes(normalized)) {
      toast.error("Tag already exists");
      setTagInput("");
      return;
    }
    
    // Check max tags
    if (tags.length >= 8) {
      toast.error("Maximum 8 tags allowed");
      setTagInput("");
      return;
    }
    
    setValue("tags", [...tags, normalized], { shouldValidate: true });
    setTagInput("");
  };

  const handleTagKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      handleAddTag();
    }
  };

  const handleRemoveTag = (tag: string) => {
    setValue(
      "tags",
      tags.filter((item: string) => item !== tag),
      { shouldValidate: true }
    );
  };

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const onSubmit = async (values: ChannelReviewFormValues) => {
    try {
      if (mode === "create") {
        await createReview.mutateAsync({
          rating: values.rating,
          title: values.title,
          content: values.content.trim(),
          tags: values.tags,
        });
        toast.success("Review published.");
      } else if (initialReview) {
        await updateReview.mutateAsync({
          reviewId: initialReview.id,
          data: {
            rating: values.rating,
            title: values.title,
            content: values.content.trim(),
            tags: values.tags,
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

  const contentLength = content.trim().length;
  const helperText =
    contentLength === 0
      ? "Share what makes this channel worth watching."
      : contentLength < 20
        ? "Write at least 20 characters."
        : `${contentLength}/1500 characters`;

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:w-[500px] flex flex-col p-0">
        {/* Fixed Header */}
        <div className="flex items-start gap-4 border-b border-border p-4 flex-shrink-0">
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
            <p className="text-sm text-muted-foreground">
              {mode === "create" ? "Write a review" : "Edit your review"}
            </p>
            <h2 className="text-xl font-bold leading-tight">{channelTitle}</h2>
            <p className="text-sm text-muted-foreground">Share your experience with this channel.</p>
          </div>
        </div>

        {/* Scrollable Content */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
            <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-6">
              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rating</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2">
                        {Array.from({ length: 5 }).map((_, index) => {
                          const value = index + 1;
                          return (
                            <Button
                              key={value}
                              type="button"
                              variant="outline"
                              size="icon"
                              className={cn(
                                "h-10 w-10 shrink-0 cursor-pointer rounded-full",
                                value <= field.value ? "border-yellow-500" : ""
                              )}
                              onClick={() => field.onChange(value)}
                            >
                              <Star
                                className={cn(
                                  "h-5 w-5",
                                  value <= field.value
                                    ? "fill-yellow-500 text-yellow-500"
                                    : "text-muted-foreground"
                                )}
                              />
                            </Button>
                          );
                        })}
                        <span className="text-sm font-medium text-muted-foreground">
                          {field.value}/5
                        </span>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Summarize your review..."
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        maxLength={120}
                      />
                    </FormControl>
                    <FormDescription>
                      {(field.value?.length ?? 0)}/120 characters
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Review</FormLabel>
                      <span className="text-xs text-muted-foreground">{helperText}</span>
                    </div>
                    <FormControl>
                      <Textarea
                        className="min-h-[220px] resize-none"
                        placeholder="What do you like about this channel? What should others expect?"
                        {...field}
                        onChange={(e) => {
                          const value = e.target.value.slice(0, 1500);
                          field.onChange(value);
                        }}
                        maxLength={1500}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Tags (optional)</FormLabel>
                      <span className="text-xs text-muted-foreground">
                        Up to 8 tags. Press Enter to add.
                      </span>
                    </div>
                    <FormControl>
                      <div className="flex flex-wrap items-center gap-2">
                        {field.value.map((tag: string) => (
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
                        {field.value.length < 8 && (
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
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Fixed Footer */}
            <div className="border-t border-border p-4 space-y-3 flex-shrink-0">
              <Button
                type="submit"
                disabled={isSubmitting || !form.formState.isValid}
                className="w-full cursor-pointer"
              >
                {isSubmitting
                  ? "Saving..."
                  : mode === "create"
                    ? "Publish review"
                    : "Update review"}
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
        </Form>
      </SheetContent>
    </Sheet>
  );
}


