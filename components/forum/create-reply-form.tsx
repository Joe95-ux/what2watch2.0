"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { TiptapEditor } from "./tiptap-editor";

interface CreateReplyFormProps {
  postId: string;
  parentReplyId?: string;
  onSuccess?: () => void;
}

export function CreateReplyForm({
  postId,
  parentReplyId,
  onSuccess,
}: CreateReplyFormProps) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");

  const createReply = useMutation({
    mutationFn: async (data: { content: string; parentReplyId?: string }) => {
      const response = await fetch(`/api/forum/posts/${postId}/replies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create reply");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-post", postId] });
      toast.success("Reply posted successfully!");
      setContent("");
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to post reply");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error("Reply content is required");
      return;
    }

    createReply.mutate({
      content: content.trim(),
      parentReplyId,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <TiptapEditor
        content={content}
        onChange={setContent}
        placeholder={parentReplyId ? "Write your reply..." : "Write a reply..."}
      />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {content.replace(/<[^>]*>/g, "").length}/5,000 characters
        </p>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setContent("");
              onSuccess?.();
            }}
            disabled={createReply.isPending}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={createReply.isPending} className="cursor-pointer">
            {createReply.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Post Reply
          </Button>
        </div>
      </div>
    </form>
  );
}

