"use client";

import { Facebook, Twitter, MessageCircle, Mail, Link2 } from "lucide-react";
import { FaShare } from "react-icons/fa6";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

export type SharePlatform = "facebook" | "twitter" | "whatsapp" | "email" | "link";

interface ShareDropdownProps {
  shareUrl: string;
  title?: string;
  description?: string;
  onShare?: () => void;
  className?: string;
  variant?: "default" | "outline" | "ghost" | "link" | "destructive" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
}

export function ShareDropdown({
  shareUrl,
  title,
  description,
  onShare,
  className,
  variant = "outline",
  size = "default",
  showLabel = true,
}: ShareDropdownProps) {
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard!");
      // Don't call onShare for copy link - it's just copying, not opening share dialog
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleSocialShare = (platform: SharePlatform) => {
    if (!shareUrl) {
      toast.error("Share URL is not available.");
      return;
    }

    const encodedUrl = encodeURIComponent(shareUrl);
    const encodedTitle = encodeURIComponent(title || "Check this out");
    const encodedDescription = encodeURIComponent(
      description || `Check out this content: ${shareUrl}`
    );

    if (platform === "link") {
      handleCopyLink();
      return;
    }

    let shareUrl_platform = "";
    if (platform === "facebook") {
      shareUrl_platform = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
    } else if (platform === "twitter") {
      shareUrl_platform = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}${
        encodedDescription ? ` - ${encodedDescription}` : ""
      }`;
    } else if (platform === "whatsapp") {
      shareUrl_platform = `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`;
    } else if (platform === "email") {
      const subject = encodeURIComponent(title || "Check this out");
      const body = encodeURIComponent(description || shareUrl);
      shareUrl_platform = `mailto:?subject=${subject}&body=${body}`;
    }

    if (shareUrl_platform) {
      if (platform === "email") {
        window.location.href = shareUrl_platform;
      } else {
        window.open(shareUrl_platform, "_blank", "width=600,height=400");
      }
      if (onShare) {
        onShare();
      }
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <FaShare className="h-4 w-4" />
          {showLabel && "Share"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem
          onClick={() => handleSocialShare("facebook")}
          className="cursor-pointer"
        >
          <Facebook className="h-4 w-4 mr-2" />
          Facebook
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleSocialShare("twitter")}
          className="cursor-pointer"
        >
          <Twitter className="h-4 w-4 mr-2" />
          X (Twitter)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleSocialShare("whatsapp")}
          className="cursor-pointer"
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          WhatsApp
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleSocialShare("email")}
          className="cursor-pointer"
        >
          <Mail className="h-4 w-4 mr-2" />
          Email
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleSocialShare("link")}
          className="cursor-pointer"
        >
          <Link2 className="h-4 w-4 mr-2" />
          Copy Link
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

