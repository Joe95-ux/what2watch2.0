"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PanelLeft } from "lucide-react";
import { ForumSidebar } from "./forum-sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface ForumLayoutProps {
  children: React.ReactNode;
  mobileHeaderTitle?: string;
}

export function ForumLayout({ children, mobileHeaderTitle }: ForumLayoutProps) {
  const isMobile = useIsMobile();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Determine mobile header title
  const getMobileTitle = () => {
    if (mobileHeaderTitle) return mobileHeaderTitle;
    if (pathname === "/forum/filter") return "Filter Forum";
    if (pathname?.startsWith("/forum/")) return "Forum";
    return "Forum";
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <ForumSidebar 
        mobileOpen={mobileSidebarOpen}
        onMobileOpenChange={setMobileSidebarOpen}
      />

      {/* Main Content */}
      <div className={cn(
        "flex-1 min-w-0 transition-all duration-300 flex flex-col",
        !isMobile && "ml-64"
      )}>
        {/* Mobile Sidebar Trigger */}
        {isMobile && (
          <div className="sticky z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
            <div className="px-4 py-2 flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileSidebarOpen(true)}
                className="cursor-pointer h-9 w-9"
                aria-label="Toggle sidebar"
              >
                <PanelLeft className="h-5 w-5" />
              </Button>
              <div className="h-4 w-px bg-border flex-shrink-0" />
              <h1 className="text-sm font-semibold">{getMobileTitle()}</h1>
            </div>
          </div>
        )}

        {/* Scrollable Content Area */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

