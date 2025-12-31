"use client";

import { useRef, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { UserManagementTable } from "./user-management-table";
import { PostModerationTable } from "./post-moderation-table";
import { CategoryManagement } from "./category-management";
import { ReportsManagementTable } from "./reports-management-table";
import { Users, MessageSquare, Hash, Flag, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { FeedbackManagementTable } from "./feedback-management-table";

const tabs = [
  { id: "users", label: "Users", icon: Users },
  { id: "posts", label: "Posts", icon: MessageSquare },
  { id: "categories", label: "Categories", icon: Hash },
  { id: "reports", label: "Reports", icon: Flag },
  { id: "feedback", label: "Feedback", icon: Megaphone },
];

const VALID_TABS = new Set(tabs.map((tab) => tab.id));
const DEFAULT_TAB = "users";
const STORAGE_KEY = "forum-admin-active-tab";

export function ForumAdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const navRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement | null>(null);
  const isInitialMount = useRef(true);
  
  // Initialize activeTab from localStorage (or URL on first load, or default)
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === "undefined") {
      const tabFromUrl = searchParams.get("tab");
      return tabFromUrl && VALID_TABS.has(tabFromUrl) ? tabFromUrl : DEFAULT_TAB;
    }
    
    // On first load, prioritize URL (for sharing/bookmarking), then localStorage, then default
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && VALID_TABS.has(tabFromUrl)) {
      // Save URL tab to localStorage
      localStorage.setItem(STORAGE_KEY, tabFromUrl);
      return tabFromUrl;
    }
    
    const savedTab = localStorage.getItem(STORAGE_KEY);
    if (savedTab && VALID_TABS.has(savedTab)) {
      return savedTab;
    }
    
    return DEFAULT_TAB;
  });

  // Handle tab change (only called on user clicks)
  const handleTabChange = (newTab: string) => {
    // Update localStorage (source of truth)
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, newTab);
    }
    
    // Update state
    setActiveTab(newTab);
    
    // Update URL (for sharing/bookmarking)
    const params = new URLSearchParams(searchParams.toString());
    if (newTab === DEFAULT_TAB) {
      params.delete("tab");
    } else {
      params.set("tab", newTab);
    }
    
    const newUrl = params.toString() 
      ? `/dashboard/admin/forum?${params.toString()}` 
      : "/dashboard/admin/forum";
    
    // Use replace() when switching between tabs (no history entry)
    // Use push() when going to/from base URL (creates history entry)
    const currentTabFromUrl = searchParams.get("tab") || DEFAULT_TAB;
    const isGoingToBase = newTab === DEFAULT_TAB;
    const isGoingFromBase = !currentTabFromUrl || currentTabFromUrl === DEFAULT_TAB;
    const isSwitchingTabs = !isGoingToBase && !isGoingFromBase;
    
    if (isSwitchingTabs) {
      router.replace(newUrl);
    } else {
      router.push(newUrl);
    }
  };

  // Sync with URL changes (browser back/forward)
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // On initial mount, we already handled URL in useState initializer
      return;
    }
    
    // When URL changes (browser back/forward):
    if (tabFromUrl && VALID_TABS.has(tabFromUrl)) {
      // URL has a tab - use it and save to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, tabFromUrl);
      }
      setActiveTab(tabFromUrl);
    } else {
      // URL is base - keep current tab from localStorage (don't reset to default)
      // This allows tab to persist when navigating back from tab URL to base URL
      if (typeof window !== "undefined") {
        const savedTab = localStorage.getItem(STORAGE_KEY);
        if (savedTab && VALID_TABS.has(savedTab)) {
          // Use functional update to avoid dependency on activeTab
          setActiveTab((currentTab) => {
            // Only update if different to avoid unnecessary re-renders
            return savedTab !== currentTab ? savedTab : currentTab;
          });
        }
      }
    }
  }, [searchParams]);

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

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Forum Administration</h1>
          <p className="text-sm text-muted-foreground">
            Manage users, moderate posts, and configure forum categories
          </p>
        </div>

        {/* Sticky Nav Tabs */}
        <div className="sticky top-[65px] z-40 bg-background/95 backdrop-blur-md border-b border-border shadow-sm -mx-3 sm:-mx-4 md:-mx-6 lg:-mx-8 mb-6">
          <div className="px-3 sm:px-4 md:px-6 lg:px-8">
            <div 
              ref={navRef}
              className="flex items-center gap-8 overflow-x-auto scrollbar-hide max-w-fit"
            >
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    ref={(el) => {
                      if (activeTab === tab.id) {
                        activeTabRef.current = el;
                      }
                    }}
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

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsContent value="users" className="mt-0">
            <UserManagementTable />
          </TabsContent>

          <TabsContent value="posts" className="mt-0">
            <PostModerationTable />
          </TabsContent>

          <TabsContent value="categories" className="mt-0">
            <CategoryManagement />
          </TabsContent>

          <TabsContent value="reports" className="mt-0">
            <ReportsManagementTable />
          </TabsContent>

          <TabsContent value="feedback" className="mt-0">
            <FeedbackManagementTable />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

