"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export type LinkPageTheme = {
  buttonStyle?: "rounded" | "pill" | "square";
  backgroundColor?: string;
  buttonColor?: string;
  fontFamily?: string;
};

export interface PublicLinksPageProps {
  displayName: string | null;
  username: string | null;
  avatarUrl: string | null;
  bio: string | null;
  theme: LinkPageTheme | null;
  links: Array<{ id: string; label: string; url: string; icon?: string | null }>;
}

export function PublicLinksPage({
  displayName,
  username,
  avatarUrl,
  bio,
  theme,
  links,
}: PublicLinksPageProps) {
  const name = displayName || (username ? `@${username}` : "User");
  const buttonStyle = theme?.buttonStyle ?? "rounded";
  const bgColor = theme?.backgroundColor ?? undefined;
  const buttonColor = theme?.buttonColor ?? undefined;

  return (
    <div
      className="min-h-screen py-12 px-4 flex flex-col items-center"
      style={bgColor ? { backgroundColor: bgColor } : undefined}
    >
      <div className="w-full max-w-[28rem] flex flex-col items-center gap-6">
        {/* Profile */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="relative w-24 h-24 rounded-full overflow-hidden border-4 border-white/20 shadow-lg bg-muted">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={name}
                fill
                className="object-cover"
                sizes="96px"
                unoptimized
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-semibold text-muted-foreground">
                {name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div>
            <h1
              className="text-xl font-semibold text-foreground"
              style={theme?.fontFamily ? { fontFamily: theme.fontFamily } : undefined}
            >
              {name}
            </h1>
            {username && (
              <p className="text-sm text-muted-foreground">@{username}</p>
            )}
            {bio && (
              <p
                className="mt-2 text-sm text-muted-foreground max-w-md"
                style={theme?.fontFamily ? { fontFamily: theme.fontFamily } : undefined}
              >
                {bio}
              </p>
            )}
          </div>
        </div>

        {/* Links */}
        <div className="w-full space-y-3">
          {links.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "block w-full py-3.5 px-4 text-center font-medium text-sm transition-all hover:opacity-90 active:scale-[0.98]",
                buttonStyle === "pill" && "rounded-full",
                buttonStyle === "rounded" && "rounded-xl",
                buttonStyle === "square" && "rounded-md"
              )}
              style={
                buttonColor
                  ? { backgroundColor: buttonColor, color: "#fff" }
                  : undefined
              }
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Footer */}
        <p className="text-xs text-muted-foreground mt-4">
          Powered by{" "}
          <Link href="/" className="underline hover:text-foreground">
            What2Watch
          </Link>
        </p>
      </div>
    </div>
  );
}
