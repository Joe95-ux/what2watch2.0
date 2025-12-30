"use client";

import { useState, useRef, useEffect } from "react";
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

export function ForumAdminContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Lazy state initialization from URL
  const [activeTab, setActiveTab] = useState(() => {
    const tabFromUrl = searchParams.get("tab");
    return tabFromUrl && VALID_TABS.has(tabFromUrl) ? tabFromUrl : "users";
  });
  const navRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement | null>(null);
  const isUpdatingFromUrlRef = useRef(false);
  const previousTabRef = useRef<string | null>(() => {
    const tabFromUrl = searchParams.get("tab");
    return tabFromUrl && VALID_TABS.has(tabFromUrl) ? tabFromUrl : "users";
  });

  // Sync URL with tab changes (only when user clicks, not from URL sync)
  useEffect(() => {
    // Skip if this update came from URL change
    if (isUpdatingFromUrlRef.current) {
      isUpdatingFromUrlRef.current = false;
      previousTabRef.current = activeTab;
      return;
    }

    const currentTab = searchParams.get("tab");
    const expectedTab = activeTab === "users" ? null : activeTab;
    
    if (currentTab !== expectedTab) {
      const params = new URLSearchParams(searchParams.toString());
      if (activeTab === "users") {
        params.delete("tab");
      } else {
        params.set("tab", activeTab);
      }
      const newUrl = params.toString() ? `/dashboard/admin/forum?${params.toString()}` : "/dashboard/admin/forum";
      
      // Use push() when going from base/default to a tab (creates history entry for back button)
      // Use replace() when switching between tabs (no history entry)
      const previousTab = previousTabRef.current;
      const wasOnBaseOrDefault = !previousTab || previousTab === "users" || !searchParams.get("tab");
      const isGoingToTab = activeTab !== "users";
      
      if (wasOnBaseOrDefault && isGoingToTab) {
        router.push(newUrl);
      } else {
        router.replace(newUrl);
      }
      
      previousTabRef.current = activeTab;
    }
  }, [activeTab, router, searchParams]);

  // Sync tab with URL changes (e.g., browser back/forward)
  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    const expectedTab = tabFromUrl && VALID_TABS.has(tabFromUrl) ? tabFromUrl : "users";
    
    if (expectedTab !== activeTab) {
      isUpdatingFromUrlRef.current = true;
      setActiveTab(expectedTab);
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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

