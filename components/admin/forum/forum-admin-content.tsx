"use client";

import { useState, useRef, useEffect } from "react";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { UserManagementTable } from "./user-management-table";
import { PostModerationTable } from "./post-moderation-table";
import { CategoryManagement } from "./category-management";
import { ReportsManagementTable } from "./reports-management-table";
import { Users, MessageSquare, Hash, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { id: "users", label: "Users", icon: Users },
  { id: "posts", label: "Posts", icon: MessageSquare },
  { id: "categories", label: "Categories", icon: Hash },
  { id: "reports", label: "Reports", icon: Flag },
];

export function ForumAdminContent() {
  const [activeTab, setActiveTab] = useState("users");
  const navRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement | null>(null);

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
        </Tabs>
      </div>
    </div>
  );
}

