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
import { Loader2, Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ForumPost {
  id: string;
  slug?: string;
  title: string;
  content: string;
  tags: string[];
  tmdbId?: number;
  mediaType?: string;
  category?: {
    id: string;
    name: string;
    slug: string;
    color?: string;
    icon?: string | null;
  } | null;
}

interface EditPostDialogProps {
  isOpen: boolean;
  onClose: () => void;
  post: ForumPost;
}

export function EditPostDialog({
  isOpen,
  onClose,
  post,
}: EditPostDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.content);
  const [tags, setTags] = useState(post.tags.join(", "));
  const [categoryId, setCategoryId] = useState(post.category?.id || "none");
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTitle(post.title);
      setContent(post.content);
      setTags(post.tags.join(", "));
      setCategoryId(post.category?.id || "none");
      setStep(1);
    }
  }, [isOpen, post]);

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ["forum-categories"],
    queryFn: async () => {
      const response = await fetch("/api/forum/categories");
      if (!response.ok) return { categories: [] };
      return response.json();
    },
  });
  const categories = categoriesData?.categories || [];

  const updatePost = useMutation({
    mutationFn: async () => {
      const postId = post.slug || post.id;
      const validTags = tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0)
        .slice(0, 10);

      const response = await fetch(`/api/forum/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          tags: validTags,
          categoryId: categoryId === "none" ? null : categoryId,
          scheduledAt: scheduledAt ? scheduledAt.toISOString() : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update post");
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["forum-posts"] });
      queryClient.invalidateQueries({ queryKey: ["forum-post", post.id] });
      queryClient.invalidateQueries({ queryKey: ["forum-post", post.slug] });
      toast.success("Post updated successfully");
      onClose();
      // Navigate to updated post if slug changed
      if (data.post?.slug && data.post.slug !== post.slug) {
        router.push(`/forum/${data.post.slug}`);
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update post");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 1) {
      if (!title.trim() || !content.trim()) {
        toast.error("Title and content are required");
        return;
      }
      setStep(2);
    } else {
      updatePost.mutate();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
          <DialogDescription>
            Update your forum post details
          </DialogDescription>
        </DialogHeader>

        {/* Step Progress */}
        <div className="flex items-center gap-8 mb-4">
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
            onClick={() => title.trim() && content.trim() && setStep(2)}
            className={cn(
              "text-sm font-medium transition-colors cursor-pointer",
              step === 2 ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              (!title.trim() || !content.trim()) && "opacity-50 cursor-not-allowed"
            )}
          >
            Additional Details
          </button>
        </div>
        <div className="flex items-center gap-2 mb-4">
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter post title..."
                  className="mt-1 cursor-text"
                  required
                />
              </div>
              <div>
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your post content..."
                  className="mt-1 min-h-[200px] cursor-text"
                  required
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="tag1, tag2, tag3 (comma separated)"
                  className="mt-1 cursor-text"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Separate tags with commas (max 10)
                </p>
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger id="category" className="mt-1 cursor-pointer">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {categories.map((category: any) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.icon && <span className="mr-2">{category.icon}</span>}
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Schedule Post (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full mt-1 justify-start text-left font-normal cursor-pointer",
                        !scheduledAt && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {scheduledAt ? (
                        format(scheduledAt, "PPP 'at' p")
                      ) : (
                        <span>Select date and time</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={scheduledAt || undefined}
                      onSelect={(date) => setScheduledAt(date || null)}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {scheduledAt && (
                  <div className="flex items-center gap-2 mt-2">
                    <Input
                      type="time"
                      value={format(scheduledAt, "HH:mm")}
                      onChange={(e) => {
                        const [hours, minutes] = e.target.value.split(":").map(Number);
                        const newScheduledAt = new Date(scheduledAt);
                        newScheduledAt.setHours(hours, minutes, 0, 0);
                        setScheduledAt(newScheduledAt);
                      }}
                      className="w-fit cursor-text"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </form>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={step === 1 ? onClose : () => setStep(1)}
            className="cursor-pointer"
          >
            {step === 1 ? "Cancel" : "Back"}
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={updatePost.isPending}
            className="cursor-pointer"
          >
            {updatePost.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {step === 1 ? "Next" : "Updating..."}
              </>
            ) : (
              step === 1 ? (
                <>
                  Next
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                "Update Post"
              )
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

