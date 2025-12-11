"use client";

import { useState, useRef, useEffect } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { TopPicksTab } from "./personalized-tabs/top-picks-tab";
import { WatchGuideTab } from "./personalized-tabs/watch-guide-tab";
import { FromYourWatchlistTab } from "./personalized-tabs/from-your-watchlist-tab";
import { FanFavoritesTab } from "./personalized-tabs/fan-favorites-tab";
import { MostPopularTab } from "./personalized-tabs/most-popular-tab";

const tabs = [
  { id: "top-picks", label: "Top Picks" },
  { id: "watch-guide", label: "Watch Guide" },
  { id: "from-watchlist", label: "From Your Watchlist" },
  { id: "fan-favorites", label: "Fan Favorites" },
  { id: "most-popular", label: "Most Popular" },
];

export function PersonalizedPageClient() {
  const [activeTab, setActiveTab] = useState("top-picks");
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    // Scroll tab into view
    const tabElement = tabRefs.current[tabId];
    if (tabElement) {
      tabElement.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Nav */}
      <div className="sticky top-[65px] z-40 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-[92rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                ref={(el) => {
                  tabRefs.current[tab.id] = el;
                }}
                onClick={() => handleTabClick(tab.id)}
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
      </div>

      {/* Content */}
      <div className="max-w-[92rem] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="top-picks" className="mt-0">
            <TopPicksTab />
          </TabsContent>
          <TabsContent value="watch-guide" className="mt-0">
            <WatchGuideTab />
          </TabsContent>
          <TabsContent value="from-watchlist" className="mt-0">
            <FromYourWatchlistTab />
          </TabsContent>
          <TabsContent value="fan-favorites" className="mt-0">
            <FanFavoritesTab />
          </TabsContent>
          <TabsContent value="most-popular" className="mt-0">
            <MostPopularTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

