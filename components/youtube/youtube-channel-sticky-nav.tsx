"use client";

import { cn } from "@/lib/utils";

interface YouTubeChannelStickyNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isScrolled: boolean;
}

const tabs = [
  { id: "videos", label: "Videos" },
  { id: "shorts", label: "Shorts" },
  { id: "playlists", label: "Playlists" },
];

export default function YouTubeChannelStickyNav({ 
  activeTab, 
  onTabChange, 
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
      </div>
    </div>
  );
}

