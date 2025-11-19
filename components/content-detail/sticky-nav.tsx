"use client";

import { cn } from "@/lib/utils";

interface StickyNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isScrolled: boolean;
  type?: "movie" | "tv";
}

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "watch", label: "Where to Watch" },
  { id: "cast", label: "Cast" },
  { id: "reviews", label: "Reviews" },
  { id: "videos", label: "Videos" },
  { id: "photos", label: "Photos" },
];

export default function StickyNav({ activeTab, onTabChange, isScrolled, type }: StickyNavProps) {
  const getTabLabel = (tabId: string) => {
    if (tabId === "cast" && type === "tv") {
      return "Series Cast";
    }
    return tabs.find((t) => t.id === tabId)?.label || tabId;
  };

  return (
    <div
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        isScrolled
          ? "bg-background/95 backdrop-blur-md border-b border-border shadow-sm"
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              {getTabLabel(tab.id)}
              {activeTab === tab.id && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

