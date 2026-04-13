"use client";

import { cn } from "@/lib/utils";
import { Search } from "lucide-react";

interface YouTubeChannelStickyNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSearchClick: () => void;
  isScrolled: boolean;
  isSearchOpen?: boolean;
}

const tabs = [
  { id: "home", label: "Home" },
  { id: "videos", label: "Videos" },
  { id: "shorts", label: "Shorts" },
  { id: "playlists", label: "Playlists" },
  { id: "posts", label: "Posts" },
  { id: "reviews", label: "Reviews" },
];

export default function YouTubeChannelStickyNav({
  activeTab,
  onTabChange,
  onSearchClick,
  isScrolled,
  isSearchOpen = false,
}: YouTubeChannelStickyNavProps) {
  return (
    <div
      className={cn(
        "sticky top-0 z-40 transition-all duration-300 flex-1",
        isScrolled
          ? "bg-black/85 backdrop-blur-md border-b border-white/10"
          : "bg-black/70 backdrop-blur-md border-b border-white/10"
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
                ? "text-white"
                : "text-white/70 hover:text-white"
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        ))}
        {/* Search Icon - Toggle */}
        <button
          onClick={onSearchClick}
          className={cn(
            "relative py-4 cursor-pointer transition-colors",
            isSearchOpen ? "text-white" : "text-white/70 hover:text-white"
          )}
          aria-label={isSearchOpen ? "Close search" : "Search videos"}
          aria-pressed={isSearchOpen}
        >
          <Search className="h-5 w-5" />
          {isSearchOpen && (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
          )}
        </button>
      </div>
    </div>
  );
}

