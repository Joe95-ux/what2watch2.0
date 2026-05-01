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
import { ChevronDown, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { YouTubeBrandIcon } from "@/components/ui/youtube-brand-icon";

interface YouTubeNavDropdownProps {
  hasHeroSection?: boolean;
}

const YouTubeIcon = ({ className }: { className?: string }) => <YouTubeBrandIcon className={className} />;
const youtubeNavItems = [
  { href: "/youtube", label: "Overview", icon: YouTubeIcon },
  { href: "/youtube-channel/lists", label: "Channel Lists", icon: List },
];

export function YouTubeNavDropdown({ hasHeroSection = false }: YouTubeNavDropdownProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Check if any YouTube route is active
  const isYouTubeActive = pathname === "/youtube" || pathname?.startsWith("/youtube/");

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "relative px-3 py-2 text-sm font-medium transition-colors rounded-md flex items-center gap-1",
            hasHeroSection
              ? "hover:bg-white/10 hover:text-white"
              : "hover:bg-accent hover:text-accent-foreground",
            isYouTubeActive
              ? hasHeroSection
                ? "text-white font-semibold"
                : "text-foreground dark:text-foreground font-semibold"
              : hasHeroSection
              ? "text-white/90"
              : "text-foreground/80 dark:text-muted-foreground",
            isYouTubeActive &&
              "after:content-[''] after:absolute after:bottom-[-15px] after:left-0 after:right-0 after:h-[3px] after:bg-[#E50914] after:rounded-t-[15px]"
          )}
        >
          <span>YouTube</span>
          <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[320px] p-0">
        <DropdownMenuLabel className="px-3 py-2">YouTube Tools</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="px-2 py-1">
          {youtubeNavItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || (item.href !== "/youtube" && pathname?.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className="cursor-pointer">
                <DropdownMenuItem
                  className={cn(
                    "cursor-pointer flex items-center gap-2 px-3",
                    isActive && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => setOpen(false)}
                >
                  <Icon className="h-6 w-6 shrink-0" />
                  <span>{item.label}</span>
                </DropdownMenuItem>
              </Link>
            );
          })}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
