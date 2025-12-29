"use client";

import { useState, useCallback, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
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
import { Loader2, Mail, MessageSquare, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type ContactType = "support" | "feedback" | "general";

const CONTACT_REASONS: Record<ContactType, string[]> = {
  support: [
    "Account Issue",
    "Technical Problem",
    "Payment Issue",
    "Content Access",
    "Other Support",
  ],
  feedback: [
    "Bug Report",
    "Feature Request",
    "UI/UX Issue",
    "Performance Issue",
    "Content Issue",
    "Other",
  ],
  general: [
    "Partnership Inquiry",
    "Media Inquiry",
    "General Question",
    "Other",
  ],
};

const CONTACT_PRIORITIES: Record<ContactType, string[]> = {
  support: ["Low", "Medium", "High", "Urgent"],
  feedback: ["Low", "Medium", "High", "Urgent"],
  general: ["Low", "Medium", "High"],
};

interface ContactFormProps {
  type?: ContactType;
  onSuccess?: () => void;
}

export function ContactForm({ type: initialType = "general", onSuccess }: ContactFormProps) {
  const { user, isSignedIn } = useUser();
  const [contactType, setContactType] = useState<ContactType>(initialType);
  const [reason, setReason] = useState<string>("");
  const [priority, setPriority] = useState<string>("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when contact type changes
  useEffect(() => {
    setReason("");
    setPriority("");
    setMessage("");
  }, [contactType]);

  const handleSubmit = useCallback(async () => {
    if (!isSignedIn) {
      toast.error("Please sign in to submit a contact form");
      return;
    }

    if (!reason || !message.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Priority is optional for general enquiries
    if (contactType !== "general" && !priority) {
      toast.error("Please select a priority");
      return;
    }

    if (message.length > 2000) {
      toast.error("Message must be 2000 characters or less");
      return;
    }

    setIsSubmitting(true);
    try {
      const endpoint = contactType === "feedback" ? "/api/feedback" : "/api/contact";
      const body: any = {
        type: contactType,
        reason,
        message: message.trim(),
      };

      if (priority) {
        body.priority = priority;
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to submit form");
      }

      toast.success(
        contactType === "feedback"
          ? "Feedback submitted successfully!"
          : "Message sent successfully! We'll get back to you soon."
      );
      setReason("");
      setPriority("");
      setMessage("");
      onSuccess?.();
    } catch (error: any) {
      console.error("[ContactForm] submit error", error);
      toast.error(error.message || "Failed to submit form. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }, [isSignedIn, contactType, reason, priority, message, onSuccess]);

  const getTypeIcon = (type: ContactType) => {
    switch (type) {
      case "support":
        return <HelpCircle className="h-4 w-4" />;
      case "feedback":
        return <MessageSquare className="h-4 w-4" />;
      case "general":
        return <Mail className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: ContactType) => {
    switch (type) {
      case "support":
        return "Support";
      case "feedback":
        return "Feedback";
      case "general":
        return "General Enquiry";
    }
  };

  return (
    <div className="space-y-6">
      {/* Contact Type Selector */}
      <div className="space-y-2">
        <Label>Contact Type</Label>
        <div className="grid grid-cols-3 gap-2">
          {(["support", "feedback", "general"] as ContactType[]).map((type) => (
            <Button
              key={type}
              type="button"
              variant={contactType === type ? "default" : "outline"}
              onClick={() => setContactType(type)}
              className={cn(
                "flex items-center gap-2",
                contactType === type && "bg-primary text-primary-foreground"
              )}
            >
              {getTypeIcon(type)}
              {getTypeLabel(type)}
            </Button>
          ))}
        </div>
      </div>

      {/* Reason */}
      <div className="space-y-2">
        <Label htmlFor="reason">
          Reason <span className="text-destructive">*</span>
        </Label>
        <Select value={reason} onValueChange={setReason}>
          <SelectTrigger id="reason" className="w-full">
            <SelectValue placeholder="Select a reason" />
          </SelectTrigger>
          <SelectContent>
            {CONTACT_REASONS[contactType].map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Priority (optional for general) */}
      {contactType !== "general" && (
        <div className="space-y-2">
          <Label htmlFor="priority">
            Priority <span className="text-destructive">*</span>
          </Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger id="priority" className="w-full">
              <SelectValue placeholder="Select priority" />
            </SelectTrigger>
            <SelectContent>
              {CONTACT_PRIORITIES[contactType].map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Message */}
      <div className="space-y-2">
        <Label htmlFor="message">
          Message <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="message"
          placeholder={
            contactType === "support"
              ? "Describe your issue in detail..."
              : contactType === "feedback"
              ? "Share your feedback..."
              : "Tell us how we can help..."
          }
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="min-h-[120px]"
          maxLength={2000}
        />
        <div className="text-xs text-muted-foreground text-right">
          {message.length}/2000 characters
        </div>
      </div>

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || !reason || !message.trim() || (contactType !== "general" && !priority)}
        className="w-full"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Mail className="mr-2 h-4 w-4" />
            Send Message
          </>
        )}
      </Button>

      {!isSignedIn && (
        <p className="text-sm text-muted-foreground text-center">
          Please sign in to submit a contact form
        </p>
      )}
    </div>
  );
}

