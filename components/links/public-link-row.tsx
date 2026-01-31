"use client";

import { useRouter } from "next/navigation";
import { SocialIcon, networkFor } from "react-social-icons";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Pencil, Trash2, Share2, Link2 } from "lucide-react";
import { toast } from "sonner";

type LinkPageTheme = {
  buttonStyle?: "rounded" | "pill" | "square";
  backgroundColor?: string;
  buttonColor?: string;
};

interface PublicLinkRowProps {
  link: { id: string; label: string; url: string; icon?: string | null };
  theme: LinkPageTheme | null;
  isOwner: boolean;
}

const SHARE_PLATFORMS: Array<{ key: string; label: string; getUrl: (url: string, label: string) => string }> = [
  { key: "x", label: "X (Twitter)", getUrl: (url, label) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(label)}` },
  { key: "facebook", label: "Facebook", getUrl: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
  { key: "linkedin", label: "LinkedIn", getUrl: (url, label) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(label)}` },
  { key: "whatsapp", label: "WhatsApp", getUrl: (url, label) => `https://wa.me/?text=${encodeURIComponent(label + " " + url)}` },
];

export function PublicLinkRow({ link, theme, isOwner }: PublicLinkRowProps) {
  const router = useRouter();
  const buttonStyle = theme?.buttonStyle ?? "rounded";
  const buttonColor = theme?.buttonColor ?? undefined;
  const network = networkFor(link.url);
  const showSocialIcon = network && network !== "sharethis";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(link.url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleShare = (getUrl: (url: string, label: string) => string) => {
    const url = getUrl(link.url, link.label);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/user/links/${link.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Link removed");
      router.refresh();
    } catch {
      toast.error("Failed to delete link");
    }
  };

  return (
    <div
      className={cn(
        "flex items-center gap-2 w-full rounded-lg overflow-hidden border border-transparent",
        !buttonColor && "bg-muted/80 border-border",
        buttonStyle === "pill" && "rounded-full",
        buttonStyle === "rounded" && "rounded-xl",
        buttonStyle === "square" && "rounded-md"
      )}
      style={buttonColor ? { backgroundColor: buttonColor } : undefined}
    >
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "flex-1 flex items-center gap-3 py-3.5 px-4 min-w-0 font-medium text-sm transition-all hover:opacity-90 active:scale-[0.98]",
          buttonColor ? "text-white" : "text-foreground"
        )}
      >
        {showSocialIcon ? (
          <span className="shrink-0 w-5 h-5 flex items-center justify-center [&_.social-icon]:!w-5 [&_.social-icon]:!h-5">
            <SocialIcon
              network={network}
              as="span"
              style={{ width: 20, height: 20 }}
              className="!block"
            />
          </span>
        ) : null}
        <span className="truncate">{link.label}</span>
      </a>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "shrink-0 h-9 w-9 rounded-full cursor-pointer",
              buttonColor ? "text-white hover:bg-white/20" : ""
            )}
            aria-label="Link options"
            onClick={(e) => e.preventDefault()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[10rem]">
          {isOwner && (
            <>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/settings?section=links">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer">
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem className="cursor-pointer" onClick={handleCopyLink}>
                <Link2 className="mr-2 h-4 w-4" />
                Copy link
              </DropdownMenuItem>
              {SHARE_PLATFORMS.map((p) => (
                <DropdownMenuItem
                  key={p.key}
                  className="cursor-pointer"
                  onClick={() => handleShare(p.getUrl)}
                >
                  <span className="mr-2 w-4 h-4 flex items-center justify-center [&_.social-icon]:!w-4 [&_.social-icon]:!h-4">
                    <SocialIcon network={p.key} as="span" style={{ width: 16, height: 16 }} />
                  </span>
                  {p.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
