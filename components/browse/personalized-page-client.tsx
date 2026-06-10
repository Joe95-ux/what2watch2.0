"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
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

const DEFAULT_TAB = "top-picks";
const TAB_STORAGE_KEY = "personalized-page-tab";
const validTabIds = new Set(tabs.map((t) => t.id));

function resolveInitialTab(searchParams: URLSearchParams): string {
  if (typeof window === "undefined") {
    const tab = searchParams.get("tab");
    return tab && validTabIds.has(tab) ? tab : DEFAULT_TAB;
  }

  const tabFromUrl = searchParams.get("tab");
  if (tabFromUrl && validTabIds.has(tabFromUrl)) {
    window.localStorage.setItem(TAB_STORAGE_KEY, tabFromUrl);
    return tabFromUrl;
  }

  const savedTab = window.localStorage.getItem(TAB_STORAGE_KEY);
  if (savedTab && validTabIds.has(savedTab)) {
    return savedTab;
  }

  return DEFAULT_TAB;
}

function markTabLoaded(prev: Set<string>, tabId: string): Set<string> {
  if (prev.has(tabId)) return prev;
  const next = new Set(prev);
  next.add(tabId);
  return next;
}

export function PersonalizedPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isInitialMount = useRef(true);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const [activeTab, setActiveTab] = useState(() => resolveInitialTab(searchParams));
  const [loadedTabs, setLoadedTabs] = useState<Set<string>>(() =>
    new Set([resolveInitialTab(searchParams)])
  );

  const handleTabChange = (tabId: string) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(TAB_STORAGE_KEY, tabId);
    }

    setActiveTab(tabId);
    setLoadedTabs((prev) => markTabLoaded(prev, tabId));

    const params = new URLSearchParams(searchParams.toString());
    if (tabId === DEFAULT_TAB) {
      params.delete("tab");
    } else {
      params.set("tab", tabId);
    }

    const newUrl = params.toString()
      ? `/browse/personalized?${params.toString()}`
      : "/browse/personalized";

    const currentTabFromUrl = searchParams.get("tab") || DEFAULT_TAB;
    const isGoingToBase = tabId === DEFAULT_TAB;
    const isGoingFromBase = !searchParams.get("tab") || currentTabFromUrl === DEFAULT_TAB;
    const isSwitchingTabs = !isGoingToBase && !isGoingFromBase;

    if (isSwitchingTabs) {
      router.replace(newUrl);
    } else {
      router.push(newUrl);
    }

    const tabElement = tabRefs.current[tabId];
    if (tabElement) {
      tabElement.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  };

  // Sync with URL changes (browser back/forward, external links)
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");

    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (tabFromUrl && validTabIds.has(tabFromUrl)) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(TAB_STORAGE_KEY, tabFromUrl);
      }
      setActiveTab(tabFromUrl);
      setLoadedTabs((prev) => markTabLoaded(prev, tabFromUrl));
      return;
    }

    if (typeof window !== "undefined") {
      const savedTab = window.localStorage.getItem(TAB_STORAGE_KEY);
      if (savedTab && validTabIds.has(savedTab)) {
        setActiveTab((currentTab) => (savedTab !== currentTab ? savedTab : currentTab));
        setLoadedTabs((prev) => markTabLoaded(prev, savedTab));
      }
    }
  }, [searchParams]);

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
                onClick={() => handleTabChange(tab.id)}
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
