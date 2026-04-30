"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlaySquare, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { HamburgerButton } from "./hamburger-button";
import { useYouTubeToolsVisibility } from "@/hooks/use-youtube-tools-visibility";

const YOUTUBE_URL = "https://www.youtube.com";

interface NavLink {
  href: string;
  label: string;
}

interface NavDropdownProps {
  navLinks: NavLink[];
  hasHeroSection?: boolean;
}

const youtubeNavItems = [
  { href: "/youtube", label: "Overview", icon: PlaySquare },
  { href: "/youtube-channel/lists", label: "Channel Lists", icon: List },
];

export function NavDropdown({ navLinks, hasHeroSection = false }: NavDropdownProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { data: youtubeVisibility } = useYouTubeToolsVisibility();
  const showSimpleYouTubeLink =
    youtubeVisibility?.mode === "HIDDEN_FROM_ALL" ||
    (youtubeVisibility?.mode === "INVITE_ONLY" && !youtubeVisibility?.hasAccess);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <HamburgerButton
          isOpen={open}
          className={cn(
            "h-10 w-10 transition-colors",
            hasHeroSection
              ? "text-white hover:bg-black/20"
              : "text-muted-foreground hover:text-foreground"
          )}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {navLinks.map((link) => {
          // Check if current path matches or starts with link href (for nested routes)
          const isActive =
            pathname === link.href ||
            (link.href !== "/" && pathname?.startsWith(link.href + "/"));
          return (
            <Link key={link.href} href={link.href}>
              <DropdownMenuItem
                className={cn(
                  "cursor-pointer",
                  isActive && "bg-accent text-accent-foreground"
                )}
                onClick={() => setOpen(false)}
              >
                <span>{link.label}</span>
              </DropdownMenuItem>
            </Link>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuLabel>YouTube</DropdownMenuLabel>
        {showSimpleYouTubeLink ? (
          <a href={YOUTUBE_URL} target="_blank" rel="noopener noreferrer">
            <DropdownMenuItem className="cursor-pointer flex items-center gap-2" onClick={() => setOpen(false)}>
              <PlaySquare className="h-4 w-4" />
              <span>YouTube</span>
            </DropdownMenuItem>
          </a>
        ) : (
          youtubeNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || (item.href !== "/youtube" && pathname?.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href}>
                <DropdownMenuItem
                  className={cn(
                    "cursor-pointer flex items-center gap-2",
                    isActive && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => setOpen(false)}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </DropdownMenuItem>
              </Link>
            );
          })
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

