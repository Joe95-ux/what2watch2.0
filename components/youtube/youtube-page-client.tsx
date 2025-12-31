"use client";

import { useRef, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { YouTubeChannelsTab } from "./youtube-channels-tab";
import { YouTubeListsTab } from "./youtube-lists-tab";
import { YouTubeRecentReviewsTab } from "./youtube-recent-reviews-tab";
import { YouTubeLeaderboardTab } from "./youtube-leaderboard-tab";
import { Youtube, List, MessageSquare, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "channels", label: "Channels", icon: Youtube },
  { id: "lists", label: "Lists", icon: List },
  { id: "reviews", label: "Recent Reviews", icon: MessageSquare },
  { id: "leaderboard", label: "Leaderboard", icon: Trophy },
];

const VALID_TABS = new Set(tabs.map((tab) => tab.id));
const DEFAULT_TAB = "channels";

export function YouTubePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const previousTabRef = useRef<string | null>(null);
  
  // Single source of truth: derive activeTab from URL
  const activeTab = useMemo(() => {
    const tab = searchParams.get("tab");
    return tab && VALID_TABS.has(tab) ? tab : DEFAULT_TAB;
  }, [searchParams]);

  // Handle tab change (only called on user clicks)
  const handleTabChange = (newTab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const previousTab = previousTabRef.current || (searchParams.get("tab") || DEFAULT_TAB);
    
    if (newTab === DEFAULT_TAB) {
      params.delete("tab");
    } else {
      params.set("tab", newTab);
    }
    
    const newUrl = params.toString() 
      ? `/youtube?${params.toString()}` 
      : "/youtube";
    
    // Use push() when going to/from base URL (creates history entry)
    // Use replace() when switching between tabs (no history entry)
    const isGoingToBase = newTab === DEFAULT_TAB;
    const isGoingFromBase = previousTab === DEFAULT_TAB;
    const isSwitchingTabs = !isGoingToBase && !isGoingFromBase;
    
    if (isSwitchingTabs) {
      router.replace(newUrl);
    } else {
      router.push(newUrl);
    }
    
    previousTabRef.current = newTab;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Nav */}
      <div className="sticky top-[65px] z-40 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-[92rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={cn(
                    "relative py-4 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2",
                    activeTab === tab.id
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[92rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsContent value="channels" className="mt-0">
            <YouTubeChannelsTab />
          </TabsContent>
          <TabsContent value="lists" className="mt-0">
            <YouTubeListsTab />
          </TabsContent>
          <TabsContent value="reviews" className="mt-0">
            <YouTubeRecentReviewsTab />
          </TabsContent>
          <TabsContent value="leaderboard" className="mt-0">
            <YouTubeLeaderboardTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

