"use client";

import { useState } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { List, Bookmark, Eye, Heart, Star } from "lucide-react";
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
  { id: "liked", label: "Liked", icon: Heart },
  { id: "favorites", label: "Favorites", icon: Star },
];

export default function MyListsTab() {
  const [activeSubTab, setActiveSubTab] = useState("lists");

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

