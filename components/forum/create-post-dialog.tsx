"use client";

import { useState, useEffect } from "react";
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
import { TiptapEditor } from "./tiptap-editor";
import { CategoryFields } from "./category-fields";
import { CategorySelect } from "./category-select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Calendar, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Switch } from "@/components/ui/switch";
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
  const STORAGE_KEY = "forum-create-post-draft";
  
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [metadata, setMetadata] = useState<Record<string, any>>({});
  const [scheduledAt, setScheduledAt] = useState<Date | undefined>(undefined);
  const [scheduledTime, setScheduledTime] = useState<string>("");
  const [isPublic, setIsPublic] = useState(true); // Default to public

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

  // Load persisted values when dialog opens
  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const draft = JSON.parse(saved);
          setTitle(draft.title || "");
          setContent(draft.content || "");
          setTags(draft.tags || "");
          setCategoryId(draft.categoryId || "");
          setMetadata(draft.metadata || {});
          setStep(draft.step || 1);
          setIsPublic(draft.isPublic !== undefined ? draft.isPublic : true);
          if (draft.scheduledAt) {
            const date = new Date(draft.scheduledAt);
            setScheduledAt(date);
            setScheduledTime(draft.scheduledTime || "");
          }
        } else {
          // No saved draft - set default category
          if (categoriesData?.categories) {
            const generalDiscussion = categoriesData.categories.find(
              (cat: any) => cat.slug === "general-discussion"
            );
            if (generalDiscussion) {
              setCategoryId(generalDiscussion.id);
            }
          }
        }
      } catch (error) {
        // Ignore parse errors, set default category
        if (categoriesData?.categories) {
          const generalDiscussion = categoriesData.categories.find(
            (cat: any) => cat.slug === "general-discussion"
          );
          if (generalDiscussion) {
            setCategoryId(generalDiscussion.id);
          }
        }
      }
    }
  }, [isOpen, categoriesData, STORAGE_KEY]);

  // Set default category if no category is selected and no saved draft
  useEffect(() => {
    if (categoriesData?.categories && !categoryId && isOpen) {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        const generalDiscussion = categoriesData.categories.find(
          (cat: any) => cat.slug === "general-discussion"
        );
        if (generalDiscussion) {
          setCategoryId(generalDiscussion.id);
        }
      }
    }
  }, [categoriesData, categoryId, isOpen, STORAGE_KEY]);

  // Persist values to localStorage whenever they change
  useEffect(() => {
    if (isOpen && (title || content || tags || categoryId || Object.keys(metadata).length > 0)) {
      const draft = {
        title,
        content,
        tags,
        categoryId,
        metadata,
        step,
        isPublic,
        scheduledAt: scheduledAt?.toISOString(),
        scheduledTime,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    }
  }, [isOpen, title, content, tags, categoryId, metadata, step, scheduledAt, scheduledTime, STORAGE_KEY]);

  const createPost = useMutation({
    mutationFn: async (data: {
      title: string;
      content: string;
      tags: string[];
      categoryId?: string;
      metadata?: Record<string, any>;
      tmdbId?: number;
      mediaType?: "movie" | "tv";
      scheduledAt?: Date;
      status?: "PUBLIC" | "PRIVATE";
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
      // Clear persisted draft on successful submission
      localStorage.removeItem(STORAGE_KEY);
      
      queryClient.invalidateQueries({ queryKey: ["forum-posts"] });
      if (scheduledAt) {
        toast.success("Post scheduled successfully!");
      } else {
        toast.success("Post created successfully!");
      }
      setStep(1);
      handleClose();
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
    // Validate required fields for step 1
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    // For bug reports, content is not required
    const selectedCategory = categoriesData?.categories?.find((cat: any) => cat.id === categoryId);
    const slug = selectedCategory?.slug?.toLowerCase() || "";
    const isBugReport = slug === "bug-report" || slug === "help-support" || slug === "help-&-support";

    if (!isBugReport && !content.trim()) {
      toast.error("Content is required");
      return;
    }

    // Validate category-specific required fields (only recommended fields)
    if (selectedCategory) {
      // Bug Report validation - only severity, steps, expected, actual are required
      if (isBugReport) {
        if (!metadata.severity || !metadata.stepsToReproduce || !metadata.expectedBehavior || !metadata.actualBehavior) {
          toast.error("Please fill in all required bug report fields");
          return;
        }
      }
      
      // Feature Request validation - only priority and useCase are required
      if ((slug === "feature-request" || slug === "feedback" || slug === "feature-requests")) {
        if (!metadata.priority || !metadata.useCase) {
          toast.error("Please fill in all required feature request fields");
          return;
        }
      }
      
      // Playlist validation - only playlistLink is required
      if ((slug === "playlists" || slug === "playlists-lists" || slug === "playlists-&-lists")) {
        if (!metadata.playlistLink) {
          toast.error("Playlist link is required");
          return;
        }
      }
      
      // List validation - only listLink is required
      if ((slug === "lists" || slug === "curated-lists")) {
        if (!metadata.listLink) {
          toast.error("List link is required");
          return;
        }
      }
      
      // Watchlist validation - only watchlistLink is required
      if ((slug === "watchlists" || slug === "watchlist")) {
        if (!metadata.watchlistLink) {
          toast.error("Watchlist link is required");
          return;
        }
      }
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

    // Only include metadata if category is selected and has values
    const metadataToSend = Object.keys(metadata).length > 0 ? metadata : undefined;

    // For bug reports, use empty content
    const selectedCategory = categoriesData?.categories?.find((cat: any) => cat.id === categoryId);
    const slug = selectedCategory?.slug?.toLowerCase() || "";
    const isBugReport = slug === "bug-report" || slug === "help-support" || slug === "help-&-support";
    const finalContent = isBugReport ? "" : content.trim();

    createPost.mutate({
      title: title.trim(),
      content: finalContent,
      tags: tagArray,
      categoryId: categoryId || undefined,
      metadata: metadataToSend,
      tmdbId,
      mediaType,
      scheduledAt: scheduledAt,
      status: isPublic ? "PUBLIC" : "PRIVATE",
    });
  };

  const handleClose = () => {
    // Don't clear form values - they're persisted in localStorage
    // Only reset step
    setStep(1);
    onClose();
  };

  // Get selected category slug for CategoryFields
  const selectedCategory = categoriesData?.categories?.find((cat: any) => cat.id === categoryId);
  const categorySlug = selectedCategory?.slug;
  const isBugReport = categorySlug && (
    categorySlug.toLowerCase() === "bug-report" ||
    categorySlug.toLowerCase() === "help-support" ||
    categorySlug.toLowerCase() === "help-&-support"
  );

  // Determine content label based on category
  const getContentLabel = () => {
    if (!categorySlug) return "Content";
    const slug = categorySlug.toLowerCase();
    if (slug === "watchlists" || slug === "watchlist" || 
        slug === "playlists" || slug === "playlists-lists" || slug === "playlists-&-lists" ||
        slug === "lists" || slug === "curated-lists") {
      return "Content";
    }
    return "Content";
  };

  // Check if category fields should be shown before content
  const shouldShowFieldsBeforeContent = () => {
    if (!categorySlug) return false;
    const slug = categorySlug.toLowerCase();
    return (
      slug === "watchlists" || slug === "watchlist" ||
      slug === "playlists" || slug === "playlists-lists" || slug === "playlists-&-lists" ||
      slug === "lists" || slug === "curated-lists"
    );
  };

  const categories = categoriesData?.categories || [];
  const defaultCategoryId = categories.find((cat: any) => cat.slug === "general-discussion")?.id;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[45rem] h-auto overflow-hidden p-0 flex flex-col max-h-[90vh]">
        {/* Fixed Header */}
        <DialogHeader className="sticky top-0 z-10 bg-background px-6 pt-6 pb-4 border-b">
          <DialogTitle>Create New Post</DialogTitle>
          <DialogDescription>
            {step === 1 
              ? "Share your thoughts, ask questions, or start a discussion."
              : "Add tags and schedule your post (optional)."}
          </DialogDescription>
          {/* Step Indicator */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-8">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className={cn(
                    "text-sm font-medium transition-colors cursor-pointer",
                    step === 1 ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Basic Info
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (title.trim() && (isBugReport || content.trim())) {
                      handleNext();
                    }
                  }}
                  className={cn(
                    "text-sm font-medium transition-colors cursor-pointer",
                    step === 2 ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                    (!title.trim() || (!isBugReport && !content.trim())) && "opacity-50 cursor-not-allowed"
                  )}
                >
                  Additional Details
                </button>
              </div>
              {/* Post Status Toggle */}
              <div className="flex items-center gap-2">
                <Label htmlFor="post-status" className="text-sm text-muted-foreground cursor-pointer">
                  {isPublic ? "Public" : "Private"}
                </Label>
                <Switch
                  id="post-status"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors",
                step >= 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                1
              </div>
              <div className={cn(
                "h-0.5 w-12 transition-colors",
                step >= 2 ? "bg-primary" : "bg-muted"
              )} />
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors",
                step >= 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              )}>
                2
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4 min-h-0">
            {step === 1 ? (
              <div className="space-y-4">
                {/* Title and Category on same row */}
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4">
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
                    <Label htmlFor="category">Category</Label>
                    <CategorySelect
                      categories={categories}
                      value={categoryId}
                      onValueChange={(value) => {
                        setCategoryId(value);
                        // Reset metadata when category changes
                        if (value !== categoryId) {
                          setMetadata({});
                        }
                      }}
                      defaultCategoryId={defaultCategoryId}
                    />
                  </div>
                </div>

                {/* Category-specific fields - show before content for watchlist/list/playlist */}
                {categorySlug && shouldShowFieldsBeforeContent() && (
                  <CategoryFields
                    categorySlug={categorySlug}
                    metadata={metadata}
                    onChange={setMetadata}
                  />
                )}

                {/* Content field - hidden for bug reports */}
                {!isBugReport && (
                  <div className="space-y-2">
                    <Label htmlFor="content">{getContentLabel()}</Label>
                    <TiptapEditor
                      content={content}
                      onChange={setContent}
                      placeholder="Write your post content..."
                    />
                    <p className="text-xs text-muted-foreground">
                      {content.replace(/<[^>]*>/g, "").length}/10,000 characters
                    </p>
                  </div>
                )}

                {/* Category-specific fields - show after content for other categories */}
                {categorySlug && !shouldShowFieldsBeforeContent() && (
                  <CategoryFields
                    categorySlug={categorySlug}
                    metadata={metadata}
                    onChange={setMetadata}
                  />
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Tags */}
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

                {/* Schedule Post */}
                <div className="space-y-2">
                  <Label htmlFor="schedule">Schedule Post (optional)</Label>
                  <div className="space-y-3">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          id="schedule"
                          type="button"
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal cursor-pointer",
                            !scheduledAt && "text-muted-foreground"
                          )}
                        >
                          <Calendar className="mr-2 h-4 w-4" />
                          {scheduledAt ? (
                            format(scheduledAt, "PPP")
                          ) : (
                            <span>Select date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <CalendarComponent
                          mode="single"
                          selected={scheduledAt}
                          onSelect={(date) => {
                            if (date) {
                              if (scheduledAt && scheduledTime) {
                                const newDate = new Date(date);
                                newDate.setHours(scheduledAt.getHours(), scheduledAt.getMinutes(), 0, 0);
                                setScheduledAt(newDate);
                              } else {
                                const scheduled = new Date(date);
                                const now = new Date();
                                if (date.toDateString() === now.toDateString()) {
                                  scheduled.setHours(now.getHours() + 1, 0, 0, 0);
                                  const hours = String(scheduled.getHours()).padStart(2, "0");
                                  setScheduledTime(`${hours}:00`);
                                } else {
                                  scheduled.setHours(9, 0, 0, 0);
                                  setScheduledTime("09:00");
                                }
                                setScheduledAt(scheduled);
                              }
                            } else {
                              setScheduledAt(undefined);
                              setScheduledTime("");
                            }
                          }}
                          disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    
                    {scheduledAt && (
                      <div className="space-y-2">
                        <Label htmlFor="time" className="text-sm">Time</Label>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="time"
                            type="time"
                            value={scheduledTime || format(scheduledAt, "HH:mm")}
                            onChange={(e) => {
                              const time = e.target.value;
                              setScheduledTime(time);
                              if (time && scheduledAt) {
                                const [hours, minutes] = time.split(":").map(Number);
                                const newDate = new Date(scheduledAt);
                                newDate.setHours(hours, minutes, 0, 0);
                                
                                const now = new Date();
                                if (newDate <= now && newDate.toDateString() === now.toDateString()) {
                                  toast.error("Scheduled time must be in the future");
                                  return;
                                }
                                
                                setScheduledAt(newDate);
                              }
                            }}
                            className="pl-10 cursor-text"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            {scheduledAt && scheduledTime
                              ? `Will publish on ${format(scheduledAt, "PPP 'at' p")}`
                              : scheduledAt
                              ? `Will publish on ${format(scheduledAt, "PPP 'at' p")}`
                              : "Select date and time"}
                          </p>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs cursor-pointer"
                            onClick={() => {
                              setScheduledAt(undefined);
                              setScheduledTime("");
                            }}
                          >
                            Clear
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  {!scheduledAt && (
                    <p className="text-xs text-muted-foreground">
                      Leave empty to publish immediately
                    </p>
                  )}
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
