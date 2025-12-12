"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { List, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import MyListsTab from "./my-lists-tab";
import PublicListsTab from "./public-lists-tab";

const mainTabs = [
  { id: "my-lists", label: "My Lists", icon: List },
  { id: "public-lists", label: "Public Lists", icon: Globe },
];

export function ListsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(() => {
    const tab = searchParams.get("tab");
    return tab && mainTabs.some(t => t.id === tab) ? tab : "my-lists";
  });

  // Update URL when tab changes
  useEffect(() => {
    const currentTab = searchParams.get("tab");
    const expectedTab = activeTab === "my-lists" ? null : activeTab;
    
    // Only update if URL doesn't match current state
    if (currentTab !== expectedTab) {
      const params = new URLSearchParams(searchParams.toString());
      if (activeTab === "my-lists") {
        params.delete("tab");
      } else {
        params.set("tab", activeTab);
      }
      const newUrl = params.toString() ? `/lists?${params.toString()}` : "/lists";
      router.push(newUrl);
    }
  }, [activeTab, router, searchParams]);

  // Sync with URL changes (browser back/forward)
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab && mainTabs.some(t => t.id === tab)) {
      setActiveTab(tab);
    } else if (!tab) {
      setActiveTab("my-lists");
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Nav */}
      <div className="sticky top-[65px] z-40 bg-background/95 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-[92rem] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8 overflow-x-auto scrollbar-hide">
            {mainTabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
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
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsContent value="my-lists" className="mt-0">
            <MyListsTab />
          </TabsContent>
          <TabsContent value="public-lists" className="mt-0">
            <PublicListsTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

