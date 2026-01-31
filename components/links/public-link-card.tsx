"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { SocialIcon } from "react-social-icons";
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

const SHARE_PLATFORMS: Array<{ key: string; label: string; getUrl: (url: string, label: string) => string }> = [
  { key: "x", label: "X (Twitter)", getUrl: (url, label) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(label)}` },
  { key: "facebook", label: "Facebook", getUrl: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
  { key: "linkedin", label: "LinkedIn", getUrl: (url, label) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(label)}` },
  { key: "whatsapp", label: "WhatsApp", getUrl: (url, label) => `https://wa.me/?text=${encodeURIComponent(label + " " + url)}` },
];

interface PublicLinkCardProps {
  link: {
    id: string;
    label: string;
    url: string;
    icon?: string | null;
    resourceType?: string | null;
    resourceId?: string | null;
    listPreview?: { name: string; description: string | null; coverImageUrl: string | null };
    playlistPreview?: { name: string; description: string | null; coverImageUrl: string | null };
  };
  theme: LinkPageTheme | null;
  isOwner: boolean;
}

export function PublicLinkCard({ link, theme, isOwner }: PublicLinkCardProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const buttonStyle = theme?.buttonStyle ?? "rounded";
  const preview = link.listPreview ?? link.playlistPreview;
  const description = preview?.description ?? null;
  const coverImageUrl = preview?.coverImageUrl ?? null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(link.url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleShare = (getUrl: (url: string, label: string) => string) => {
    window.open(getUrl(link.url, link.label), "_blank", "noopener,noreferrer");
  };

  const performDelete = async () => {
    setDeleteOpen(false);
    const payload = { label: link.label, url: link.url, icon: link.icon ?? null, resourceType: link.resourceType ?? null, resourceId: link.resourceId ?? null };
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

  const radiusClass =
    buttonStyle === "pill" ? "rounded-full" : buttonStyle === "rounded" ? "rounded-xl" : "rounded-md";

  return (
    <div
      className={cn(
        "w-full overflow-hidden border bg-card flex flex-col",
        radiusClass,
        !theme?.buttonColor && "border-border"
      )}
      style={theme?.buttonColor ? { borderColor: "transparent" } : undefined}
    >
      {/* Section 1: banner (most height), same border radius from settings */}
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("block relative w-full h-40 bg-muted overflow-hidden", buttonStyle === "pill" ? "rounded-t-full" : buttonStyle === "rounded" ? "rounded-t-xl" : "rounded-t-md")}
      >
        {coverImageUrl ? (
          <Image
            src={coverImageUrl}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 28rem) 100vw, 28rem"
            unoptimized={coverImageUrl.startsWith("http") && !coverImageUrl.includes("image.tmdb.org")}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <span className="text-4xl">{link.listPreview ? "📋" : "▶"}</span>
          </div>
        )}
      </a>
      {/* Section 2: label + description row, three dots at end */}
      <div className="flex flex-row items-center gap-2 p-3 flex-shrink-0">
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-w-0 flex flex-col"
        >
          <p className="font-medium text-sm truncate">{link.label}</p>
          {description ? (
            <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{description}</p>
          ) : null}
        </a>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-9 w-9 rounded-full cursor-pointer"
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
                <DropdownMenuItem className="cursor-pointer py-2.5" onClick={handleCopyLink}>
                  <Link2 className="mr-3 h-5 w-5 shrink-0" />
                  Copy link
                </DropdownMenuItem>
                {SHARE_PLATFORMS.map((p) => (
                  <DropdownMenuItem
                    key={p.key}
                    className="cursor-pointer py-2.5"
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
      </div>
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
    </div>
  );
}
