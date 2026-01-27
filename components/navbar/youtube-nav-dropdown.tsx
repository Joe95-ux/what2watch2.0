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
import { Youtube, TrendingUp, BarChart3, Sparkles, ChevronDown, Target, Stethoscope, Lightbulb, Bell, MessageSquare, Award } from "lucide-react";
import { cn } from "@/lib/utils";

interface YouTubeNavDropdownProps {
  hasHeroSection?: boolean;
}

  const youtubeNavItems = [
    { href: "/youtube", label: "Overview", icon: Youtube },
    { href: "/youtube/trends", label: "Trending Topics", icon: TrendingUp },
    { href: "/youtube/analyzer", label: "Title Analyzer", icon: BarChart3 },
    { href: "/youtube/gaps", label: "Content Gaps", icon: Target },
    { href: "/youtube/diagnostic", label: "Channel Diagnostic", icon: Stethoscope },
    { href: "/youtube/formats", label: "Format Inspiration", icon: Lightbulb },
    { href: "/youtube/questions", label: "Comment Questions", icon: MessageSquare },
    { href: "/youtube/benchmarks", label: "Performance Benchmarks", icon: Award },
    { href: "/youtube/alerts", label: "Trend Alerts", icon: Bell },
    { href: "/youtube/insights", label: "Content Insights", icon: Sparkles },
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
      <DropdownMenuContent align="start" className="w-[480px] p-0">
        <DropdownMenuLabel className="px-3 py-2">YouTube Tools</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="flex px-2">
          {/* Left Column */}
          <div className="flex-1 py-1 pr-2">
            {youtubeNavItems.slice(0, 5).map((item) => {
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
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </DropdownMenuItem>
                </Link>
              );
            })}
          </div>
          
          {/* Vertical Separator */}
          <div className="w-px bg-border my-1" />
          
          {/* Right Column */}
          <div className="flex-1 py-1 pl-2">
            {youtubeNavItems.slice(5).map((item) => {
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
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </DropdownMenuItem>
                </Link>
              );
            })}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
