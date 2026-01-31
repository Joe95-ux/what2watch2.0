"use client";

import Image from "next/image";
import Link from "next/link";
import { SocialIcon, networkFor } from "react-social-icons";
import { PublicLinkRow } from "@/components/links/public-link-row";
import { PublicLinkCard } from "@/components/links/public-link-card";

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

  return (
    <div
      className="min-h-screen py-12 px-4 flex flex-col items-center"
      style={bgColor ? { backgroundColor: bgColor } : undefined}
    >
      <div className="w-full max-w-[28rem] flex flex-col gap-6">
        {/* Header: avatar + name block, centered */}
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

        {/* Social icons: new row, centered */}
        {socialLinks.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            {socialLinks.map((link) => {
              const network = networkFor(link.url);
              return (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-muted/80 hover:bg-muted transition-colors [&_.social-icon]:!w-6 [&_.social-icon]:!h-6"
                  aria-label={link.label}
                >
                  <SocialIcon
                    network={network}
                    as="span"
                    style={{ width: 24, height: 24 }}
                    className="!block"
                  />
                </a>
              );
            })}
          </div>
        )}

        {/* About me: centered, bio in dashed div with 5px radius */}
        {bio && (
          <section className="w-full text-center">
            <h2 className="text-sm font-semibold text-foreground mb-2">About me</h2>
            <div
              className="border border-dashed border-border rounded-[5px] p-3 text-sm text-muted-foreground text-center"
              style={theme?.fontFamily ? { fontFamily: theme.fontFamily } : undefined}
            >
              {bio}
            </div>
          </section>
        )}

        {/* Links block: no wrapper card */}
        <div className="w-full space-y-3">
          {links.map((link) =>
            link.listPreview || link.playlistPreview ? (
              <PublicLinkCard
                key={link.id}
                link={link}
                theme={theme}
                isOwner={isOwner}
              />
            ) : (
              <PublicLinkRow
                key={link.id}
                link={link}
                theme={theme}
                isOwner={isOwner}
              />
            )
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
