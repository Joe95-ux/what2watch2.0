"use client";

import { cn } from "@/lib/utils";
import { List, Star, Heart, Users, UserCheck, ClipboardList, Bookmark } from "lucide-react";
import { useRef, useEffect } from "react";

interface ProfileStickyNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isScrolled: boolean;
  counts?: {
    playlists?: number;
    lists?: number;
    watchlist?: number;
    favorites?: number;
    followers?: number;
    following?: number;
    reviews?: number;
  };
}

const tabs = [
  { id: "playlists", label: "Playlists", icon: List },
  { id: "lists", label: "Lists", icon: ClipboardList },
  { id: "watchlist", label: "Watchlist", icon: Bookmark },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "my-list", label: "My List", icon: Heart },
  { id: "followers", label: "Followers", icon: Users },
  { id: "following", label: "Following", icon: UserCheck },
];

export default function ProfileStickyNav({ 
  activeTab, 
  onTabChange,
  isScrolled,
  counts = {}
}: ProfileStickyNavProps) {
  const navRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  // Scroll active tab into view when it changes
  useEffect(() => {
    if (activeTabRef.current && navRef.current) {
      const nav = navRef.current;
      const activeButton = activeTabRef.current;
      const navRect = nav.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      
      // Calculate if button is out of view
      const isOutOfViewLeft = buttonRect.left < navRect.left;
      const isOutOfViewRight = buttonRect.right > navRect.right;
      
      if (isOutOfViewLeft || isOutOfViewRight) {
        activeButton.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
          inline: "center",
        });
      }
    }
  }, [activeTab]);

  const getTabLabel = (tab: typeof tabs[0]) => {
    const count = counts[tab.id as keyof typeof counts] as number | undefined;
    if (count !== undefined && tab.id !== "reviews") {
      return `${tab.label} (${count})`;
    }
    return tab.label;
  };

  return (
    <div
      ref={navRef}
      className={cn(
        "sticky top-[65px] z-40 transition-all duration-300",
        isScrolled
          ? "bg-background/95 backdrop-blur-md border-b border-border shadow-sm"
          : "bg-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-8 overflow-x-auto scrollbar-hide scroll-smooth">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                ref={isActive ? activeTabRef : null}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "relative py-4 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 flex-shrink-0",
                  isActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {getTabLabel(tab)}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

