"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface CreatePostDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tmdbId?: number;
  mediaType?: "movie" | "tv";
}

export function CreatePostDialog({
  isOpen,
  onClose,
  tmdbId,
  mediaType,
}: CreatePostDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [scheduledAt, setScheduledAt] = useState<Date | undefined>(undefined);

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ["forum-categories"],
    queryFn: async () => {
      const response = await fetch("/api/forum/categories");
      if (!response.ok) {
        return { categories: [] };
      }
      return response.json();
    },
  });

  const createPost = useMutation({
    mutationFn: async (data: {
      title: string;
      content: string;
      tags: string[];
      categoryId?: string;
      tmdbId?: number;
      mediaType?: "movie" | "tv";
      scheduledAt?: Date;
    }) => {
      const response = await fetch("/api/forum/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create post");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["forum-posts"] });
      if (scheduledAt) {
        toast.success("Post scheduled successfully!");
      } else {
        toast.success("Post created successfully!");
      }
      onClose();
      setTitle("");
      setContent("");
      setTags("");
      setCategoryId("");
      setScheduledAt(undefined);
      setStep(1);
      if (!scheduledAt) {
        const postSlug = data.post.slug || data.post.id;
        router.push(`/forum/${postSlug}`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create post");
    },
  });

  const handleNext = () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    if (!content.trim()) {
      toast.error("Content is required");
      return;
    }

    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const tagArray = tags
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0)
      .slice(0, 5);

    createPost.mutate({
      title: title.trim(),
      content: content.trim(),
      tags: tagArray,
      categoryId: categoryId || undefined,
      tmdbId,
      mediaType,
      scheduledAt: scheduledAt,
    });
  };

  const handleClose = () => {
    setStep(1);
    setTitle("");
    setContent("");
    setTags("");
    setCategoryId("");
    setScheduledAt(undefined);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] h-auto overflow-hidden p-0 flex flex-col max-h-[90vh]">
        {/* Fixed Header */}
        <DialogHeader className="sticky top-0 z-10 bg-background px-6 pt-6 pb-4 border-b">
          <DialogTitle>Create New Post</DialogTitle>
          <DialogDescription>
            {step === 1 
              ? "Share your thoughts, ask questions, or start a discussion."
              : "Add tags and schedule your post (optional)."}
          </DialogDescription>
          {/* Step Indicator */}
          <div className="flex items-center gap-2 mt-4">
            <div className={cn(
              "flex-1 h-1.5 rounded-full transition-colors",
              step >= 1 ? "bg-primary" : "bg-muted"
            )} />
            <div className={cn(
              "flex-1 h-1.5 rounded-full transition-colors",
              step >= 2 ? "bg-primary" : "bg-muted"
            )} />
          </div>
        </DialogHeader>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4 min-h-0">
            {step === 1 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter post title..."
                    maxLength={200}
                    required
                    className="cursor-text"
                  />
                  <p className="text-xs text-muted-foreground">
                    {title.length}/200 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="content">Content</Label>
                  <Textarea
                    id="content"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your post content..."
                    rows={10}
                    maxLength={10000}
                    required
                    className="resize-none cursor-text"
                  />
                  <p className="text-xs text-muted-foreground">
                    {content.length}/10,000 characters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category (optional)</Label>
                  <Select value={categoryId || "none"} onValueChange={(value) => setCategoryId(value === "none" ? "" : value)}>
                    <SelectTrigger id="category" className="cursor-pointer">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {categoriesData?.categories?.map((category: any) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma-separated, max 5)</Label>
                  <Input
                    id="tags"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="e.g., discussion, question, review"
                    className="cursor-text"
                  />
                  <p className="text-xs text-muted-foreground">
                    Separate tags with commas. Maximum 5 tags.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="schedule">Schedule Post (optional)</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        id="schedule"
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal cursor-pointer",
                          !scheduledAt && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {scheduledAt ? (
                          format(scheduledAt, "PPP p")
                        ) : (
                          <span>Schedule for later</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={scheduledAt}
                        onSelect={(date) => {
                          if (date) {
                            // Set time to current time or 9 AM if in the past
                            const now = new Date();
                            const scheduled = new Date(date);
                            scheduled.setHours(now.getHours(), now.getMinutes(), 0, 0);
                            // If the date is today and time has passed, set to 9 AM tomorrow
                            if (scheduled < now && scheduled.toDateString() === now.toDateString()) {
                              scheduled.setDate(scheduled.getDate() + 1);
                              scheduled.setHours(9, 0, 0, 0);
                            }
                            setScheduledAt(scheduled);
                          } else {
                            setScheduledAt(undefined);
                          }
                        }}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        initialFocus
                      />
                      {scheduledAt && (
                        <div className="p-3 border-t space-y-2">
                          <div className="text-xs text-muted-foreground">
                            Scheduled: {format(scheduledAt, "PPP 'at' p")}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full cursor-pointer"
                            onClick={() => setScheduledAt(undefined)}
                          >
                            Clear schedule
                          </Button>
                        </div>
                      )}
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">
                    {scheduledAt
                      ? `Post will be published on ${format(scheduledAt, "PPP 'at' p")}`
                      : "Leave empty to publish immediately"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Fixed Footer */}
          <DialogFooter className="sticky bottom-0 z-10 bg-background border-t px-6 py-4">
            <div className="flex items-center justify-between w-full gap-3">
              {step === 1 ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleClose}
                    disabled={createPost.isPending}
                    className="cursor-pointer"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleNext}
                    disabled={createPost.isPending}
                    className="cursor-pointer"
                  >
                    Next
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleBack}
                    disabled={createPost.isPending}
                    className="cursor-pointer"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <div className="flex items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleClose}
                      disabled={createPost.isPending}
                      className="cursor-pointer"
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createPost.isPending} className="cursor-pointer">
                      {createPost.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Create Post
                    </Button>
                  </div>
                </>
              )}
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

