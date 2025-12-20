"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Link as LinkIcon } from "lucide-react";
import { ExtractedLink } from "@/lib/forum-link-extractor";
import { cn } from "@/lib/utils";

interface LinkSelectorModalProps {
  links: ExtractedLink[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLinkSelect?: (link: ExtractedLink) => void;
}

export function LinkSelectorModal({
  links,
  open,
  onOpenChange,
  onLinkSelect,
}: LinkSelectorModalProps) {
  const handleLinkClick = (link: ExtractedLink) => {
    if (onLinkSelect) {
      onLinkSelect(link);
    } else {
      window.open(link.url, "_blank", "noopener,noreferrer");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Select Link
          </DialogTitle>
          <DialogDescription>
            Choose a link to open from this post
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {links.map((link, index) => (
            <Button
              key={index}
              variant="outline"
              className={cn(
                "w-full justify-start h-auto p-4 flex flex-col items-start gap-2",
                "hover:bg-accent transition-colors"
              )}
              onClick={() => handleLinkClick(link)}
            >
              <div className="flex items-start justify-between w-full gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {link.text !== link.url ? link.text : "Link"}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {link.url}
                  </div>
                  {link.domain && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {link.domain}
                    </div>
                  )}
                </div>
                <ExternalLink className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              </div>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

