"use client";

import { useState, useEffect, useCallback } from "react";
import { Megaphone, Command, CornerDownLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const FEEDBACK_REASONS = [
  "Bug Report",
  "Feature Request",
  "UI/UX Issue",
  "Performance Issue",
  "Content Issue",
  "Account Issue",
  "Other",
];

const FEEDBACK_PRIORITIES = [
  "Low",
  "Medium",
  "High",
  "Urgent",
];

export function FeedbackDropdown({ hasHeroSection }: { hasHeroSection?: boolean }) {
  const { user } = useUser();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMac, setIsMac] = useState(false);

  // Detect if user is on Mac
  useEffect(() => {
    setIsMac(/Mac|iPhone|iPod|iPad/i.test(navigator.platform));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!user) {
      toast.error("Please sign in to submit feedback");
      return;
    }

    if (!reason || !priority || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason,
          priority,
          message: message.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit feedback");
      }

      toast.success("Feedback submitted successfully!");
      setReason("");
      setPriority("");
      setMessage("");
      setOpen(false);
    } catch (error) {
      console.error("[FeedbackDropdown] submit error", error);
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [user, reason, priority, message]);

  // Handle Ctrl+Enter shortcut
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (reason && priority && message.trim() && !isSubmitting) {
          handleSubmit();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, reason, priority, message, isSubmitting, handleSubmit]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn("cursor-pointer",
                hasHeroSection && "[&_button]:hover:bg-black/20 [&_button]:text-white"
              )}
            >
              <Megaphone className="h-5 w-5" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <p>Feedback</p>
        </TooltipContent>
      </Tooltip>
      <PopoverContent className="w-[400px] p-4" align="end">
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold mb-4">Feedback</h3>
            
            {/* Reason and Priority on same row */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-xs">Reason</Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger id="reason" className="h-9 w-full">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent>
                    {FEEDBACK_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority" className="text-xs">Priority</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger id="priority" className="h-9 w-full">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    {FEEDBACK_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Textarea */}
            <div className="space-y-2 mb-4">
              <Label htmlFor="message" className="text-xs">Message</Label>
              <Textarea
                id="message"
                placeholder="Describe your feedback, issue, or suggestion..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[120px] resize-none"
                maxLength={2000}
              />
              <div className="text-xs text-muted-foreground text-right">
                {message.length}/2000
              </div>
            </div>

            {/* Footer with help link and send button */}
            <div className="flex items-center justify-between pt-2 border-t">
              <Link
                href="/contact"
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                Need help? Contact us
              </Link>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !reason || !priority || !message.trim()}
                size="sm"
                className="gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <span>Send</span>
                    <div className="flex items-center gap-0.5">
                      {isMac ? (
                        <kbd className="px-1.5 py-0.5 bg-muted/20 rounded-xl text-[10px] flex items-center justify-center">
                          <Command className="h-3 w-3" />
                        </kbd>
                      ) : (
                        <kbd className="px-1.5 py-0.5 bg-muted/20 rounded-xl text-[10px] font-mono">Ctrl</kbd>
                      )}
                      <kbd className="px-1.5 py-0.5 bg-muted/20 rounded-xl text-[10px] flex items-center justify-center">
                        <CornerDownLeft className="h-3 w-3" />
                      </kbd>
                    </div>
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

