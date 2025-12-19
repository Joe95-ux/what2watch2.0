"use client";

import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { TiptapEditor } from "./tiptap-editor";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface ForumReply {
  id: string;
  content: string;
}

interface EditReplyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  reply: ForumReply;
  postId: string;
}

export function EditReplyDialog({
  isOpen,
  onClose,
  reply,
  postId,
}: EditReplyDialogProps) {
  const queryClient = useQueryClient();
  const STORAGE_KEY = `forum-edit-reply-draft-${reply.id}`;
  
  const [content, setContent] = useState(reply.content);

  // Load persisted values or reply data when dialog opens
  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const draft = JSON.parse(saved);
          setContent(draft.content || reply.content);
        } else {
          setContent(reply.content);
        }
      } catch (error) {
        console.error("Error loading draft:", error);
        setContent(reply.content);
      }
    }
  }, [isOpen, reply.content, STORAGE_KEY]);

  // Save draft to localStorage
  useEffect(() => {
    if (isOpen && content !== reply.content) {
      try {
        const draft = {
          content,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      } catch (error) {
        console.error("Error saving draft:", error);
      }
    }
  }, [isOpen, content, reply.content, STORAGE_KEY]);

  const updateReply = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/forum/replies/${reply.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to update reply");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["forum-post", postId] });
      // Clear draft on success
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (error) {
        console.error("Error clearing draft:", error);
      }
      toast.success("Reply updated successfully");
      onClose();
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update reply");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast.error("Reply content is required");
      return;
    }

    if (content.replace(/<[^>]*>/g, "").length > 5000) {
      toast.error("Reply must be 5,000 characters or less");
      return;
    }

    updateReply.mutate();
  };

  const handleClose = () => {
    if (updateReply.isPending) return;
    onClose();
  };

  const characterCount = content.replace(/<[^>]*>/g, "").length;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Reply</DialogTitle>
          <DialogDescription>
            Update your reply. Changes will be visible to all users.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <TiptapEditor
              content={content}
              onChange={setContent}
              placeholder="Write your reply..."
            />
            <p className="text-xs text-muted-foreground text-right">
              {characterCount}/5,000 characters
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={updateReply.isPending}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateReply.isPending || !content.trim() || characterCount > 5000}
              className="cursor-pointer"
            >
              {updateReply.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Update Reply
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

