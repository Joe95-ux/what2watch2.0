"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { SocialIcon, networkFor } from "react-social-icons";
import { PublicLinkRow } from "@/components/links/public-link-row";
import { PublicLinkCard } from "@/components/links/public-link-card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, ChevronUp, Share2, Link2 } from "lucide-react";
import { toast } from "sonner";

const PAGE_SHARE_PLATFORMS: Array<{ key: string; getUrl: (url: string, label: string) => string }> = [
  { key: "x", getUrl: (url, label) => `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(label)}` },
  { key: "facebook", getUrl: (url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
  { key: "linkedin", getUrl: (url, label) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&summary=${encodeURIComponent(label)}` },
  { key: "whatsapp", getUrl: (url, label) => `https://wa.me/?text=${encodeURIComponent(label + " " + url)}` },
];

export type LinkPageTheme = {
  buttonStyle?: "rounded" | "pill" | "square";
  backgroundColor?: string;
  buttonColor?: string;
  fontFamily?: string;
};

export type PublicLink = {
  id: string;
  label: string;
  url: string;
  icon?: string | null;
  resourceType?: string | null;
  resourceId?: string | null;
  listPreview?: { name: string; description: string | null; coverImageUrl: string | null };
  playlistPreview?: { name: string; description: string | null; coverImageUrl: string | null };
  customPreview?: { coverImageUrl: string; description: string | null };
  isSensitiveContent?: boolean;
};

export interface PublicLinksPageProps {
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  theme: LinkPageTheme | null;
  links: PublicLink[];
  isOwner?: boolean;
}

export function PublicLinksPage({
  displayName,
  username,
  avatarUrl,
  bio,
  theme,
  links,
  isOwner = false,
}: PublicLinksPageProps) {
  const name = displayName || (username ? `@${username}` : "User");
  const bgColor = theme?.backgroundColor ?? undefined;

  const socialLinks = links.filter((link) => {
    const network = networkFor(link.url);
    return network && network !== "sharethis";
  });

  const MAX_LINKS_DISPLAY = 10;
  const INITIAL_VISIBLE = 6;
  const [linksExpanded, setLinksExpanded] = useState(false);
  const displayedLinks = links.slice(0, MAX_LINKS_DISPLAY);
  const initialLinks = displayedLinks.slice(0, INITIAL_VISIBLE);
  const restLinks = displayedLinks.slice(INITIAL_VISIBLE);
  const hasMoreLinks = restLinks.length > 0;

  const renderLink = (link: PublicLink) =>
    link.listPreview || link.playlistPreview || link.customPreview ? (
      <PublicLinkCard key={link.id} link={link} theme={theme} isOwner={isOwner} />
    ) : (
      <PublicLinkRow key={link.id} link={link} theme={theme} isOwner={isOwner} />
    );

  const [pageUrl, setPageUrl] = useState("");
  useEffect(() => {
    if (username && typeof window !== "undefined") {
      setPageUrl(`${window.location.origin}/links/${username}`);
    }
  }, [username]);
  const shareLabel = name;

  const handleCopyPageLink = async () => {
    if (!pageUrl) return;
    try {
      await navigator.clipboard.writeText(pageUrl);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleSharePage = (getUrl: (url: string, label: string) => string) => {
    if (!pageUrl) return;
    window.open(getUrl(pageUrl, shareLabel), "_blank", "noopener,noreferrer");
  };

  return (
    <div
      className="min-h-screen py-12 px-4 flex flex-col items-center"
      style={bgColor ? { backgroundColor: bgColor } : undefined}
    >
      <div className="w-full max-w-[28rem] flex flex-col gap-6">
        {/* Header: avatar + name block, flex-col centered */}
        <div className="flex flex-col items-center justify-center gap-3 text-center">
          <div className="relative w-20 h-20 shrink-0 rounded-full overflow-hidden border-4 border-white/20 shadow-lg bg-muted">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={name}
                fill
                className="object-cover"
                sizes="80px"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-2xl font-semibold text-muted-foreground">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h1
              className="text-xl font-semibold text-foreground break-words"
              style={theme?.fontFamily ? { fontFamily: theme.fontFamily } : undefined}
            >
              {name}
            </h1>
            {username && (
              <p className="text-sm text-muted-foreground break-all">@{username}</p>
            )}
          </div>
        </div>

        {/* Social icons + Share: row, overflow-x-auto with no scrollbar */}
        <div className="w-full overflow-x-auto scrollbar-hide">
          <div className="flex items-center justify-center gap-3 flex-nowrap min-w-min">
            {socialLinks.map((link) => {
            const network = networkFor(link.url);
            return (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-12 h-12 shrink-0 rounded-full bg-muted/80 hover:bg-muted transition-colors ring-0 focus:ring-0 focus-visible:ring-0 outline-none [&_.social-icon]:!w-8 [&_.social-icon]:!h-8"
                aria-label={link.label}
              >
                <SocialIcon
                  network={network}
                  as="span"
                  style={{ width: 32, height: 32 }}
                  className="!block"
                />
              </a>
            );
          })}
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-12 w-12 rounded-full bg-muted/80 hover:bg-muted shrink-0 ring-0 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 outline-none"
                aria-label="Share page"
              >
                <Share2 className="h-6 w-6" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-auto min-w-[200px] p-0">
              <p className="text-center text-sm font-semibold py-3 border-b border-border">
                Share Via
              </p>
              <div className="flex items-center gap-3 p-3 overflow-x-auto scrollbar-hide">
                <button
                  type="button"
                  onClick={handleCopyPageLink}
                  className="flex items-center justify-center w-14 h-14 shrink-0 rounded-full bg-muted/80 hover:bg-muted transition-colors cursor-pointer"
                  aria-label="Copy link"
                >
                  <Link2 className="h-7 w-7" />
                </button>
                {PAGE_SHARE_PLATFORMS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => handleSharePage(p.getUrl)}
                    className="flex items-center justify-center w-14 h-14 shrink-0 rounded-full bg-muted/80 hover:bg-muted transition-colors cursor-pointer [&_.social-icon]:!w-7 [&_.social-icon]:!h-7"
                    aria-label={p.key}
                  >
                    <SocialIcon network={p.key} as="span" style={{ width: 28, height: 28 }} className="!block" />
                  </button>
                ))}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>

        {/* About me: centered, bio in dashed div with 10px radius */}
        {bio && (
          <section className="w-full text-center">
            <h2 className="text-sm font-semibold text-foreground mb-2 uppercase">About me</h2>
            <div
              className="border border-dashed border-border rounded-[10px] p-3 text-sm text-muted-foreground text-center"
              style={theme?.fontFamily ? { fontFamily: theme.fontFamily } : undefined}
            >
              {bio}
            </div>
          </section>
        )}

        {/* My Links: first 6 visible, show more/less for rest (max 10) */}
        <div className="w-full text-center">
          <h2 className="text-sm font-semibold text-foreground mb-3 uppercase">My Links</h2>
          <div className="space-y-3">
            {initialLinks.map(renderLink)}
            <div
              className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
              style={{ maxHeight: linksExpanded ? "2000px" : "0px" }}
            >
              <div className="space-y-3">
                {restLinks.map(renderLink)}
              </div>
            </div>
          </div>
          {hasMoreLinks && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 w-full cursor-pointer text-muted-foreground hover:text-foreground"
              onClick={() => setLinksExpanded((v) => !v)}
            >
              {linksExpanded ? (
                <>
                  <ChevronUp className="mr-1 h-4 w-4" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="mr-1 h-4 w-4" />
                  Show more ({restLinks.length})
                </>
              )}
            </Button>
          )}
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground text-center">
          Powered by{" "}
          <Link href="/" className="underline hover:text-foreground">
            What2Watch
          </Link>
        </p>
      </div>
    </div>
  );
}
