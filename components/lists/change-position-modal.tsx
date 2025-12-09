"use client";

import { useState, useEffect } from "react";
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
import { toast } from "sonner";

interface ChangePositionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPosition: number;
  maxPosition: number;
  title: string;
  onConfirm: (newPosition: number) => Promise<void>;
}

export function ChangePositionModal({
  open,
  onOpenChange,
  currentPosition,
  maxPosition,
  title,
  onConfirm,
}: ChangePositionModalProps) {
  const [newPosition, setNewPosition] = useState(currentPosition.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update newPosition when currentPosition or open changes
  useEffect(() => {
    if (open) {
      setNewPosition(currentPosition.toString());
    }
  }, [open, currentPosition]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const positionNum = parseInt(newPosition, 10);

    if (isNaN(positionNum) || positionNum < 1 || positionNum > maxPosition) {
      toast.error(`Position must be between 1 and ${maxPosition}`);
      return;
    }

    if (positionNum === currentPosition) {
      onOpenChange(false);
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(positionNum);
      toast.success("Position updated successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update position");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Position</DialogTitle>
          <DialogDescription>
            Set a new position for <strong>{title}</strong>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-position">Current Position</Label>
              <Input
                id="current-position"
                value={currentPosition}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-position">New Position (1 - {maxPosition})</Label>
              <Input
                id="new-position"
                type="number"
                min={1}
                max={maxPosition}
                value={newPosition}
                onChange={(e) => setNewPosition(e.target.value)}
                placeholder={`Enter position (1-${maxPosition})`}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="cursor-pointer">
              {isSubmitting ? "Updating..." : "Update Position"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

