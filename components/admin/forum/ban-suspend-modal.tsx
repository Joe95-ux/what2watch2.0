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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

interface BanSuspendModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string, until?: Date) => Promise<void>;
  actionType: "ban" | "suspend";
  userName?: string;
  isLoading?: boolean;
}

export function BanSuspendModal({
  isOpen,
  onClose,
  onConfirm,
  actionType,
  userName,
  isLoading = false,
}: BanSuspendModalProps) {
  const [reason, setReason] = useState("");
  const [temporary, setTemporary] = useState(false);
  const [days, setDays] = useState(7);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError("Please provide a reason for this action.");
      return;
    }

    if (reason.trim().length < 10) {
      setError("Reason must be at least 10 characters long.");
      return;
    }

    setError("");
    const until = temporary ? new Date(Date.now() + days * 24 * 60 * 60 * 1000) : undefined;
    await onConfirm(reason.trim(), until);
    // Reset form on success
    setReason("");
    setTemporary(false);
    setDays(7);
  };

  const handleClose = () => {
    setReason("");
    setTemporary(false);
    setDays(7);
    setError("");
    onClose();
  };

  const actionTitle = actionType === "ban" ? "Ban User" : "Suspend User";
  const actionDescription = actionType === "ban" 
    ? "Banning a user prevents them from accessing the forum entirely."
    : "Suspending a user prevents them from creating new posts or taking certain actions, but they can still view content.";

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{actionTitle}</DialogTitle>
          <DialogDescription>
            {actionDescription}
            {userName && (
              <span className="block mt-2 font-medium">
                User: {userName}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder={`Explain why this user is being ${actionType === "ban" ? "banned" : "suspended"}. This message will be sent to the user and can be used for appeals.`}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError("");
              }}
              rows={4}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground">
              Minimum 10 characters. This reason will be visible to the user.
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="temporary"
                checked={temporary}
                onChange={(e) => setTemporary(e.target.checked)}
                className="rounded border-gray-300"
              />
              <Label htmlFor="temporary" className="font-normal cursor-pointer">
                Temporary {actionType === "ban" ? "ban" : "suspension"}
              </Label>
            </div>
            {temporary && (
              <div className="ml-6 space-y-2">
                <Label htmlFor="days">Duration (days)</Label>
                <input
                  type="number"
                  id="days"
                  min="1"
                  max="365"
                  value={days}
                  onChange={(e) => setDays(Math.max(1, Math.min(365, parseInt(e.target.value) || 7)))}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            )}
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>Appeal Process:</strong> The user will receive an email and notification about this action. 
              They can appeal by contacting support through their dashboard.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isLoading}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            variant={actionType === "ban" ? "destructive" : "default"}
            onClick={handleSubmit}
            disabled={isLoading || !reason.trim()}
            className="cursor-pointer"
          >
            {isLoading ? "Processing..." : `Confirm ${actionTitle}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

