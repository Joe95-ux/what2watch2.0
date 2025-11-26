"use client";

import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

interface YouTubeChannelStickyNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSearchClick: () => void;
  isScrolled: boolean;
}

const tabs = [
  { id: "home", label: "Home" },
  { id: "videos", label: "Videos" },
  { id: "shorts", label: "Shorts" },
  { id: "playlists", label: "Playlists" },
  { id: "posts", label: "Posts" },
];

export default function YouTubeChannelStickyNav({ 
  activeTab, 
  onTabChange,
  onSearchClick,
  isScrolled 
}: YouTubeChannelStickyNavProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-50 transition-all duration-300 flex-1",
        isScrolled
          ? "bg-background/95 backdrop-blur-md border-b border-border shadow-sm"
          : "bg-transparent"
      )}
    >
      <div className="flex items-center gap-8 overflow-x-auto scrollbar-hide">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "relative py-4 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer",
              activeTab === tab.id
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
        {/* Search Icon - After Posts */}
        <button
          onClick={onSearchClick}
          className="relative py-4 cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Search videos"
        >
          <Search className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

