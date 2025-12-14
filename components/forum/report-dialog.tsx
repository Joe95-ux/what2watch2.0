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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ReportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string, description?: string) => Promise<void>;
  type: "post" | "reply";
  isPending?: boolean;
}

export function ReportDialog({
  isOpen,
  onClose,
  onSubmit,
  type,
  isPending = false,
}: ReportDialogProps) {
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      return;
    }
    await onSubmit(reason.trim(), description.trim() || undefined);
    setReason("");
    setDescription("");
    onClose();
  };

  const handleClose = () => {
    setReason("");
    setDescription("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Report {type === "post" ? "Post" : "Reply"}</DialogTitle>
          <DialogDescription>
            Please provide a reason for reporting this {type}. This helps us maintain a safe and respectful community.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Reason *</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Please describe why you are reporting this content..."
                rows={4}
                required
                className="cursor-text resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Additional Details (optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Any additional information that might be helpful..."
                rows={3}
                className="cursor-text resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isPending}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || !reason.trim()}
              className="cursor-pointer"
            >
              {isPending ? "Submitting..." : "Submit Report"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

