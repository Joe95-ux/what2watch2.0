"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import MyListsListsTab from "./my-lists-lists-tab";
import MyListsWatchlistTab from "./my-lists-watchlist-tab";
import MyListsWatchedTab from "./my-lists-watched-tab";
import MyListsLikedTab from "./my-lists-liked-tab";
import MyListsFavoritesTab from "./my-lists-favorites-tab";
import { useUser } from "@clerk/nextjs";
import { useClerk } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const subTabs = [
  { id: "lists", label: "Lists" },
  { id: "watchlist", label: "Watchlist" },
  { id: "watched", label: "Watched" },
  { id: "liked", label: "Liked" },
  { id: "favorites", label: "Favorites" },
];

export default function MyListsTab() {
  const { isSignedIn, isLoaded } = useUser();
  const { openSignIn } = useClerk();
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

  // Show loading state while auth is being checked
  if (!isLoaded) {
    return null; // Or you could return a loading skeleton here
  }

  // Show sign-in prompt for unauthenticated users (only after auth is loaded)
  if (!isSignedIn) {
    return (
      <div className="text-center py-12 space-y-4">
        <h3 className="text-xl font-semibold">Access Your Lists</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Sign in to view and manage your lists, watchlist, watched items, liked content, and favorites.
        </p>
        <Button
          onClick={() => {
            toast.info("Sign in to access your lists.");
            if (openSignIn) {
              openSignIn({
                afterSignInUrl: typeof window !== "undefined" ? window.location.href : undefined,
              });
            }
          }}
          className="mt-4 cursor-pointer"
        >
          Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-border">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2 py-4">
            {subTabs.map((tab) => (
              <Button
                key={tab.id}
                variant="outline"
                size="sm"
                onClick={() => setActiveSubTab(tab.id)}
                className={cn(
                  "h-9 rounded-[25px] cursor-pointer flex-shrink-0 px-4 transition-colors",
                  activeSubTab === tab.id
                    ? "bg-blue-50 dark:bg-muted border-blue-200 dark:border-border text-foreground"
                    : "bg-muted border-none text-muted-foreground hover:bg-muted/80"
                )}
              >
                {tab.label}
              </Button>
            ))}
          </div>
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

