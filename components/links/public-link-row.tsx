"use client";

import { useState } from "react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreVertical, Pencil, Trash2, Share2, Link2 } from "lucide-react";
import { toast } from "sonner";

type LinkPageTheme = {
  buttonStyle?: "rounded" | "pill" | "square";
  backgroundColor?: string;
  buttonColor?: string;
};

interface PublicLinkRowProps {
  link: { id: string; label: string; url: string; icon?: string | null; resourceType?: string | null; resourceId?: string | null; bannerImageUrl?: string | null; customDescription?: string | null; isSensitiveContent?: boolean };
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
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [consentOpen, setConsentOpen] = useState(false);
  const buttonStyle = theme?.buttonStyle ?? "rounded";
  const buttonColor = theme?.buttonColor ?? undefined;
  const network = networkFor(link.url);
  const showSocialIcon = network && network !== "sharethis";
  const isSensitive = link.isSensitiveContent === true;

  const openLink = () => {
    window.open(link.url, "_blank", "noopener,noreferrer");
    setConsentOpen(false);
  };

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

  const performDelete = async () => {
    setDeleteOpen(false);
    const payload = { label: link.label, url: link.url, icon: link.icon ?? null, resourceType: link.resourceType ?? null, resourceId: link.resourceId ?? null, bannerImageUrl: link.bannerImageUrl ?? null, customDescription: link.customDescription ?? null, isSensitiveContent: link.isSensitiveContent ?? false };
    try {
      const res = await fetch(`/api/user/links/${link.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      router.refresh();
      toast.success("Link removed", {
        action: {
          label: "Undo",
          onClick: async () => {
            try {
              const createRes = await fetch("/api/user/links", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              if (!createRes.ok) throw new Error("Failed to restore");
              router.refresh();
              toast.success("Link restored");
            } catch {
              toast.error("Failed to restore link");
            }
          },
        },
      });
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
      {isSensitive ? (
        <button
          type="button"
          onClick={() => setConsentOpen(true)}
          className={cn(
            "flex-1 flex items-center gap-3 py-3.5 px-4 min-w-0 font-medium text-sm transition-all hover:opacity-90 active:scale-[0.98] text-left cursor-pointer",
            buttonColor ? "text-white" : "text-foreground"
          )}
        >
          {showSocialIcon ? (
          <span className="shrink-0 w-7 h-7 flex items-center justify-center [&_.social-icon]:!w-7 [&_.social-icon]:!h-7">
            <SocialIcon
              network={network}
              as="span"
              style={{ width: 28, height: 28 }}
              className="!block"
            />
          </span>
        ) : null}
        <span className="truncate">{link.label}</span>
        </button>
      ) : (
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
          <span className="shrink-0 w-7 h-7 flex items-center justify-center [&_.social-icon]:!w-7 [&_.social-icon]:!h-7">
            <SocialIcon
              network={network}
              as="span"
              style={{ width: 28, height: 28 }}
              className="!block"
            />
          </span>
        ) : null}
        <span className="truncate">{link.label}</span>
      </a>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "shrink-0 h-9 w-9 rounded-full cursor-pointer ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none",
              buttonColor ? "text-white hover:bg-white/20" : ""
            )}
            aria-label="Link options"
            onClick={(e) => e.preventDefault()}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[12rem]">
          {isOwner && (
            <>
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/settings?section=links">
                  <Pencil className="mr-3 h-4 w-4" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer text-destructive focus:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-3 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="cursor-pointer">
              <Share2 className="mr-3 h-4 w-4" />
              Share
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="min-w-[12rem]">
              <DropdownMenuItem className="cursor-pointer py-1.5" onClick={handleCopyLink}>
                <Link2 className="mr-3 h-5 w-5 shrink-0" />
                Copy link
              </DropdownMenuItem>
              {SHARE_PLATFORMS.map((p) => (
                <DropdownMenuItem
                  key={p.key}
                  className="cursor-pointer py-1.5"
                  onClick={() => handleShare(p.getUrl)}
                >
                  <span className="mr-3 w-8 h-8 flex items-center justify-center shrink-0 [&_.social-icon]:!w-6 [&_.social-icon]:!h-6">
                    <SocialIcon network={p.key} as="span" style={{ width: 24, height: 24 }} />
                  </span>
                  {p.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove link?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove &quot;{link.label}&quot; from your link page. You can undo this from the toast.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={performDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={consentOpen} onOpenChange={setConsentOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sensitive content</AlertDialogTitle>
            <AlertDialogDescription>
              This link may contain sexually explicit or sensitive content. Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={openLink}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
