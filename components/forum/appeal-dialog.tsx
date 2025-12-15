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

interface AppealDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (appealReason: string) => Promise<void>;
  type: "post" | "reply";
  content: string;
  reportReason: string;
  isPending?: boolean;
}

export function AppealDialog({
  isOpen,
  onClose,
  onSubmit,
  type,
  content,
  reportReason,
  isPending = false,
}: AppealDialogProps) {
  const [appealReason, setAppealReason] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appealReason.trim()) {
      return;
    }
    await onSubmit(appealReason.trim());
    setAppealReason("");
    onClose();
  };

  const handleClose = () => {
    setAppealReason("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Appeal Report</DialogTitle>
          <DialogDescription>
            Your {type} has been reported. If you believe this is a mistake, you can appeal the report.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Your Content</Label>
              <div className="p-3 rounded-lg border bg-muted/50">
                <p className="text-sm whitespace-pre-wrap">{content}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Report Reason</Label>
              <div className="p-3 rounded-lg border bg-muted/50">
                <p className="text-sm">{reportReason}</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="appealReason">Appeal Reason *</Label>
              <Textarea
                id="appealReason"
                value={appealReason}
                onChange={(e) => setAppealReason(e.target.value)}
                placeholder="Please explain why you believe this report is incorrect..."
                rows={5}
                required
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
              disabled={isPending || !appealReason.trim()}
              className="cursor-pointer"
            >
              {isPending ? "Submitting..." : "Submit Appeal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

