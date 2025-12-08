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

interface ChangeOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentOrder: number;
  maxOrder: number;
  title: string;
  onConfirm: (newOrder: number) => Promise<void>;
}

export function ChangeOrderModal({
  open,
  onOpenChange,
  currentOrder,
  maxOrder,
  title,
  onConfirm,
}: ChangeOrderModalProps) {
  const [newOrder, setNewOrder] = useState(currentOrder.toString());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Update newOrder when currentOrder or open changes
  useEffect(() => {
    if (open) {
      setNewOrder(currentOrder.toString());
    }
  }, [open, currentOrder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const orderNum = parseInt(newOrder, 10);

    if (isNaN(orderNum) || orderNum < 1 || orderNum > maxOrder) {
      toast.error(`Order must be between 1 and ${maxOrder}`);
      return;
    }

    if (orderNum === currentOrder) {
      onOpenChange(false);
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(orderNum);
      toast.success("Order updated successfully");
      onOpenChange(false);
    } catch (error) {
      toast.error("Failed to update order");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change Order</DialogTitle>
          <DialogDescription>
            Set a new order for <strong>{title}</strong>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="current-order">Current Order</Label>
              <Input
                id="current-order"
                value={currentOrder}
                disabled
                className="bg-muted"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-order">New Order (1 - {maxOrder})</Label>
              <Input
                id="new-order"
                type="number"
                min={1}
                max={maxOrder}
                value={newOrder}
                onChange={(e) => setNewOrder(e.target.value)}
                placeholder={`Enter order (1-${maxOrder})`}
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
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Order"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

