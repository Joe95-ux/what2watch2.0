"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Copy, Check, Facebook, Twitter, Link2 } from "lucide-react";
import { toast } from "sonner";
import type { List } from "@/hooks/use-lists";

interface ShareListDialogProps {
  list: List;
  isOpen: boolean;
  onClose: () => void;
  isOwnList?: boolean;
}

export default function ShareListDialog({ list, isOpen, onClose, isOwnList = true }: ShareListDialogProps) {
  const [copied, setCopied] = useState(false);
  
  const shareUrl = typeof window !== "undefined" 
    ? `${window.location.origin}/lists/${list.id}`
    : "";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
      console.error(error);
    }
  };

  const handleSocialShare = (platform: "facebook" | "twitter") => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(list.name);
    const encodedDescription = encodeURIComponent(list.description || "");

    let shareUrl_platform = "";
    if (platform === "facebook") {
      shareUrl_platform = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    } else if (platform === "twitter") {
      shareUrl_platform = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}${encodedDescription ? ` - ${encodedDescription}` : ""}`;
    }

    if (shareUrl_platform) {
      window.open(shareUrl_platform, "_blank", "width=600,height=400");
    }
  };

  const isPublic = list.visibility === "PUBLIC" || list.visibility === "FOLLOWERS_ONLY";

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share List</DialogTitle>
          <DialogDescription>
            Share your list with others using the link below
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {isPublic && (
            <>
              {/* Share Link */}
              <div className="space-y-2">
                <Label>Share Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={shareUrl}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                    className="shrink-0"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Social Share Buttons */}
              <div className="space-y-2">
                <Label>Share on</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleSocialShare("facebook")}
                  >
                    <Facebook className="h-4 w-4 mr-2" />
                    Facebook
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleSocialShare("twitter")}
                  >
                    <Twitter className="h-4 w-4 mr-2" />
                    Twitter
                  </Button>
                </div>
              </div>
            </>
          )}

          {!isPublic && (
            <div className="p-4 rounded-lg border bg-muted/50 text-center">
              <Link2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {isOwnList 
                  ? "Make the list public or followers-only to generate a shareable link"
                  : "This list is private and cannot be shared"}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

