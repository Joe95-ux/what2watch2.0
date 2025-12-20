"use client";

import { cn } from "@/lib/utils";
import { List, Star, Heart, Users, UserCheck, ClipboardList, MessageSquare } from "lucide-react";
import { useRef, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface PublicProfileStickyNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isScrolled: boolean;
  counts?: {
    playlists?: number;
    lists?: number;
    favorites?: number;
    followers?: number;
    following?: number;
    discussions?: number;
  };
  isOwnProfile?: boolean;
  isLoading?: boolean;
}

const tabs = [
  { id: "lists", label: "Lists", icon: ClipboardList },
  { id: "playlists", label: "Playlists", icon: List },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "my-list", label: "My List", icon: Heart },
  { id: "discussions", label: "Discussions", icon: MessageSquare },
  { id: "followers", label: "Followers", icon: Users },
  { id: "following", label: "Following", icon: UserCheck },
];

export default function PublicProfileStickyNav({ 
  activeTab, 
  onTabChange,
  isScrolled,
  counts = {},
  isOwnProfile = false,
  isLoading = false
}: PublicProfileStickyNavProps) {
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

  // Filter tabs based on isOwnProfile
  const visibleTabs = tabs.filter(tab => {
    if (tab.id === "my-list" && !isOwnProfile) {
      return false;
    }
    return true;
  });

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
      <div className="max-w-[70rem] mx-auto">
        <div className="flex items-center gap-8 overflow-x-auto scrollbar-hide scroll-smooth">
          {isLoading ? (
            <>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-20 flex-shrink-0" />
              ))}
            </>
          ) : (
            visibleTabs.map((tab) => {
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
            })
          )}
        </div>
      </div>
    </div>
  );
}

