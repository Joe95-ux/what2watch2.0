"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { List, Bookmark, Eye, ThumbsUp, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import MyListsListsTab from "./my-lists-lists-tab";
import MyListsWatchlistTab from "./my-lists-watchlist-tab";
import MyListsWatchedTab from "./my-lists-watched-tab";
import MyListsLikedTab from "./my-lists-liked-tab";
import MyListsFavoritesTab from "./my-lists-favorites-tab";

const subTabs = [
  { id: "lists", label: "Lists", icon: List },
  { id: "watchlist", label: "Watchlist", icon: Bookmark },
  { id: "watched", label: "Watched", icon: Eye },
  { id: "liked", label: "Liked", icon: ThumbsUp },
  { id: "favorites", label: "Favorites", icon: Heart },
];

export default function MyListsTab() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeSubTab, setActiveSubTab] = useState(() => {
    const subTab = searchParams.get("subTab");
    return subTab && subTabs.some(t => t.id === subTab) ? subTab : "lists";
  });

  // Update URL when sub-tab changes
  useEffect(() => {
    const currentSubTab = searchParams.get("subTab");
    const expectedSubTab = activeSubTab === "lists" ? null : activeSubTab;
    
    // Only update if URL doesn't match current state
    if (currentSubTab !== expectedSubTab) {
      const params = new URLSearchParams(searchParams.toString());
      if (activeSubTab === "lists") {
        params.delete("subTab");
      } else {
        params.set("subTab", activeSubTab);
      }
      const newUrl = params.toString() ? `/lists?${params.toString()}` : "/lists";
      router.push(newUrl);
    }
  }, [activeSubTab, router]);

  // Sync with URL changes (browser back/forward)
  useEffect(() => {
    const subTab = searchParams.get("subTab");
    if (subTab && subTabs.some(t => t.id === subTab)) {
      setActiveSubTab(subTab);
    } else if (!subTab) {
      setActiveSubTab("lists");
    }
  }, [searchParams]);

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="border-b border-border">
        <div className="flex items-center gap-6 overflow-x-auto scrollbar-hide">
          {subTabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={cn(
                  "relative py-3 text-sm font-medium transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2",
                  activeSubTab === tab.id
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
                {activeSubTab === tab.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-tab Content */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab} className="w-full">
        <TabsContent value="lists" className="mt-0">
          <MyListsListsTab />
        </TabsContent>
        <TabsContent value="watchlist" className="mt-0">
          <MyListsWatchlistTab />
        </TabsContent>
        <TabsContent value="watched" className="mt-0">
          <MyListsWatchedTab />
        </TabsContent>
        <TabsContent value="liked" className="mt-0">
          <MyListsLikedTab />
        </TabsContent>
        <TabsContent value="favorites" className="mt-0">
          <MyListsFavoritesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

