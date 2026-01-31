"use client";

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
    listPreview?: { name: string; description: string | null; coverImageUrl: string | null };
    playlistPreview?: { name: string; description: string | null; coverImageUrl: string | null };
  };
  theme: LinkPageTheme | null;
  isOwner: boolean;
}

export function PublicLinkCard({ link, theme, isOwner }: PublicLinkCardProps) {
  const router = useRouter();
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

  const radiusClass =
    buttonStyle === "pill" ? "rounded-full" : buttonStyle === "rounded" ? "rounded-xl" : "rounded-md";

  return (
    <div
      className={cn(
        "w-full overflow-hidden border bg-card",
        radiusClass,
        !theme?.buttonColor && "border-border"
      )}
      style={theme?.buttonColor ? { borderColor: "transparent" } : undefined}
    >
      <div className="flex">
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex min-w-0"
        >
          <div className="flex flex-1 min-w-0">
            {coverImageUrl ? (
              <div className="relative w-24 h-24 shrink-0 bg-muted">
                <Image
                  src={coverImageUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="96px"
                  unoptimized={coverImageUrl.startsWith("http") && !coverImageUrl.includes("image.tmdb.org")}
                />
              </div>
            ) : (
              <div className="w-24 h-24 shrink-0 bg-muted flex items-center justify-center text-muted-foreground">
                <span className="text-2xl">{link.listPreview ? "📋" : "▶"}</span>
              </div>
            )}
            <div className="flex-1 min-w-0 p-3 flex flex-col justify-center">
              <p className="font-medium text-sm truncate">{link.label}</p>
              {description ? (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{description}</p>
              ) : null}
            </div>
          </div>
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
                  onClick={handleDelete}
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
                    <span className="mr-3 w-6 h-6 flex items-center justify-center shrink-0 [&_.social-icon]:!w-5 [&_.social-icon]:!h-5">
                      <SocialIcon network={p.key} as="span" style={{ width: 20, height: 20 }} />
                    </span>
                    {p.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
