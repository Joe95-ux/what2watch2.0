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
import { Youtube, TrendingUp, BarChart3, Sparkles, ChevronRight, Target, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";
import { HamburgerButton } from "./hamburger-button";

interface NavLink {
  href: string;
  label: string;
}

interface NavDropdownProps {
  navLinks: NavLink[];
  hasHeroSection?: boolean;
}

const youtubeNavItems = [
  { href: "/youtube", label: "Overview", icon: Youtube },
  { href: "/youtube/trends", label: "Trending Topics", icon: TrendingUp },
  { href: "/youtube/analyzer", label: "Title Analyzer", icon: BarChart3 },
  { href: "/youtube/gaps", label: "Content Gaps", icon: Target },
  { href: "/youtube/diagnostic", label: "Channel Diagnostic", icon: Stethoscope },
  { href: "/youtube/insights", label: "Content Insights", icon: Sparkles },
];

export function NavDropdown({ navLinks, hasHeroSection = false }: NavDropdownProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [youtubeOpen, setYoutubeOpen] = useState(false);

  const isYouTubeActive = pathname === "/youtube" || pathname?.startsWith("/youtube/");

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
        {youtubeNavItems.map((item) => {
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
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

