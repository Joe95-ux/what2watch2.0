"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { TopPicksTab } from "./personalized-tabs/top-picks-tab";
import { WatchGuideTab } from "./personalized-tabs/watch-guide-tab";
import { FromYourWatchlistTab } from "./personalized-tabs/from-your-watchlist-tab";
import { RankChartsTab } from "./personalized-tabs/rank-charts-tab";
import { MostPopularTab } from "./personalized-tabs/most-popular-tab";

const tabs = [
  { id: "top-picks", label: "Top Picks" },
  { id: "watch-guide", label: "Watch Guide" },
  { id: "from-watchlist", label: "From Your Watchlist" },
  { id: "rank-charts", label: "Rank Charts" },
  { id: "most-popular", label: "Most Popular" },
];

const TAB_STORAGE_KEY = "personalized-page-tab";
const validTabIds = new Set(tabs.map((t) => t.id));

function getStoredTab(): string {
  if (typeof window === "undefined") return "top-picks";
  const stored = window.localStorage.getItem(TAB_STORAGE_KEY);
  return stored && validTabIds.has(stored) ? stored : "top-picks";
}

function resolveTab(urlTab: string | null): string {
  if (urlTab && validTabIds.has(urlTab)) return urlTab;
  return getStoredTab();
}

export function PersonalizedPageClient() {
  const searchParams = useSearchParams();
  const urlTabParam = searchParams.get("tab");
  const urlTab = urlTabParam && validTabIds.has(urlTabParam) ? urlTabParam : null;

  const [activeTab, setActiveTab] = useState(urlTab ?? "top-picks");
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(
    () => new Set([urlTab ?? "top-picks"])
  );
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  // URL tab overrides localStorage; otherwise restore persisted tab and ensure its content loads
  useEffect(() => {
    const resolved = resolveTab(urlTab);
    setActiveTab(resolved);
    setLoadedTabs((prev) => {
      const next = new Set(prev);
      next.add(resolved);
      return next;
    });
    if (urlTab) {
      window.localStorage.setItem(TAB_STORAGE_KEY, urlTab);
    }
  }, [urlTab]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setLoadedTabs((prev) => {
      if (prev.has(tabId)) return prev;
      const next = new Set(prev);
      next.add(tabId);
      return next;
    });
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TAB_STORAGE_KEY, tabId);
    }
    const tabElement = tabRefs.current[tabId];
    if (tabElement) {
      tabElement.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  };

  const handleTabClick = (tabId: string) => handleTabChange(tabId);

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
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsContent value="top-picks" className="mt-0">
            {loadedTabs.has("top-picks") ? <TopPicksTab /> : null}
          </TabsContent>
          <TabsContent value="watch-guide" className="mt-0">
            {loadedTabs.has("watch-guide") ? <WatchGuideTab /> : null}
          </TabsContent>
          <TabsContent value="from-watchlist" className="mt-0">
            {loadedTabs.has("from-watchlist") ? <FromYourWatchlistTab /> : null}
          </TabsContent>
          <TabsContent value="rank-charts" className="mt-0">
            {loadedTabs.has("rank-charts") ? <RankChartsTab /> : null}
          </TabsContent>
          <TabsContent value="most-popular" className="mt-0">
            {loadedTabs.has("most-popular") ? <MostPopularTab /> : null}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

