"use client";

import { useState, useMemo } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { 
  Home, 
  MessageCircle, 
  Users, 
  Award, 
  Filter, 
  TrendingUp, 
  BookOpen,
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Hash
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetClose } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import Link from "next/link";

interface ForumSidebarProps {
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
}

export function ForumSidebar({ 
  mobileOpen,
  onMobileOpenChange
}: ForumSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const [internalOpen, setInternalOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Use controlled state if provided, otherwise use internal state
  const isOpen = mobileOpen !== undefined ? mobileOpen : internalOpen;
  const setIsOpen = onMobileOpenChange || setInternalOpen;

  // Fetch categories
  const { data: categoriesData, isLoading: isLoadingCategories } = useQuery({
    queryKey: ["forum-categories"],
    queryFn: async () => {
      const response = await fetch("/api/forum/categories");
      if (!response.ok) return { categories: [] };
      return response.json();
    },
  });

  // Fetch trending topics (placeholder - will implement later)
  const { data: trendingData } = useQuery({
    queryKey: ["forum-trending"],
    queryFn: async () => {
      // TODO: Implement trending topics API
      return { topics: [] };
    },
  });

  const categories = categoriesData?.categories || [];
  const activeCategory = searchParams.get("category");

  const getCategoryColor = (color?: string | null) => {
    if (!color) return "bg-blue-500/20 text-blue-700 dark:text-blue-400";
    
    // Vibrant color mapping inspired by badge colors
    const colorMap: Record<string, string> = {
      "#3B82F6": "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
      "#10B981": "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
      "#F59E0B": "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30",
      "#EF4444": "bg-red-500/20 text-red-700 dark:text-red-400 border-red-500/30",
      "#8B5CF6": "bg-violet-500/20 text-violet-700 dark:text-violet-400 border-violet-500/30",
      "#EC4899": "bg-pink-500/20 text-pink-700 dark:text-pink-400 border-pink-500/30",
      "#06B6D4": "bg-cyan-500/20 text-cyan-700 dark:text-cyan-400 border-cyan-500/30",
      "#84CC16": "bg-lime-500/20 text-lime-700 dark:text-lime-400 border-lime-500/30",
      "#F97316": "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30",
      "#A855F7": "bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30",
    };
    
    return colorMap[color] || `bg-[${color}]/20 text-[${color}] border-[${color}]/30`;
  };

  const [categoriesExpanded, setCategoriesExpanded] = useState(false);
  const visibleCategories = categoriesExpanded ? categories : categories.slice(0, 10);
  const hasMoreCategories = categories.length > 10;

  const sidebarContent = (
    <div className="flex flex-col h-full bg-background">
      {/* Mobile Close Button - Fixed */}
      {isMobile && (
        <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
          <h2 className="font-semibold text-lg">Forum</h2>
          <SheetClose asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </SheetClose>
        </div>
      )}
      
      {/* Collapse Button - Desktop only - Fixed */}
      {!isMobile && (
        <div className={cn(
          "p-2 border-b flex items-center transition-all flex-shrink-0",
          isCollapsed ? "justify-center" : "justify-end"
        )}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8",
                  isCollapsed && "mx-auto"
                )}
                onClick={() => setIsCollapsed(!isCollapsed)}
              >
                {isCollapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Scrollable Content */}
      <ScrollArea className="flex-1 min-h-0 overflow-hidden">
        {/* Navigation Links */}
        <div className={cn(
          "border-b transition-all",
          isCollapsed ? "p-2 space-y-1" : "p-4 space-y-2"
        )}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={pathname === "/forum" ? "secondary" : "ghost"}
                className={cn(
                  "w-full transition-all",
                  isCollapsed ? "justify-center p-2" : "justify-start gap-3"
                )}
                onClick={() => {
                  router.push("/forum");
                  if (isMobile) setIsOpen(false);
                }}
              >
                <Home className="h-4 w-4" />
                {!isCollapsed && <span>Home</span>}
              </Button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">
                <span>Home</span>
              </TooltipContent>
            )}
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full transition-all",
                  isCollapsed ? "justify-center p-2" : "justify-start gap-3"
                )}
                onClick={() => {
                  // TODO: Navigate to topics page
                  if (isMobile) setIsOpen(false);
                }}
              >
                <MessageCircle className="h-4 w-4" />
                {!isCollapsed && <span>Topics</span>}
              </Button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">
                <span>Topics</span>
              </TooltipContent>
            )}
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full transition-all",
                  isCollapsed ? "justify-center p-2" : "justify-start gap-3"
                )}
                onClick={() => {
                  // TODO: Navigate to users page
                  if (isMobile) setIsOpen(false);
                }}
              >
                <Users className="h-4 w-4" />
                {!isCollapsed && <span>Users</span>}
              </Button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">
                <span>Users</span>
              </TooltipContent>
            )}
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full transition-all",
                  isCollapsed ? "justify-center p-2" : "justify-start gap-3"
                )}
                onClick={() => {
                  // TODO: Navigate to badges page
                  if (isMobile) setIsOpen(false);
                }}
              >
                <Award className="h-4 w-4" />
                {!isCollapsed && <span>Badges</span>}
              </Button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">
                <span>Badges</span>
              </TooltipContent>
            )}
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full transition-all",
                  isCollapsed ? "justify-center p-2" : "justify-start gap-3"
                )}
                onClick={() => {
                  // TODO: Navigate to blog page
                  if (isMobile) setIsOpen(false);
                }}
              >
                <BookOpen className="h-4 w-4" />
                {!isCollapsed && <span>Blog</span>}
              </Button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">
                <span>Blog</span>
              </TooltipContent>
            )}
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={pathname === "/forum/filter" ? "secondary" : "ghost"}
                className={cn(
                  "w-full transition-all",
                  isCollapsed ? "justify-center p-2" : "justify-start gap-3"
                )}
                onClick={() => {
                  router.push("/forum/filter");
                  if (isMobile) setIsOpen(false);
                }}
              >
                <Filter className="h-4 w-4" />
                {!isCollapsed && <span>Filter</span>}
              </Button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">
                <span>Filter</span>
              </TooltipContent>
            )}
          </Tooltip>
        </div>

        {/* Categories */}
        {!isCollapsed && (
          <div className="p-4 border-b">
            <div className="mb-3">
              <h3 className="text-sm font-semibold">Categories</h3>
            </div>
            {isLoadingCategories ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : categories.length > 0 ? (
              <div className="space-y-2">
                <Button
                  variant={!activeCategory ? "secondary" : "ghost"}
                  className="w-full justify-start text-sm"
                  onClick={() => {
                    const params = new URLSearchParams(searchParams.toString());
                    params.delete("category");
                    router.push(`/forum?${params.toString()}`);
                    if (isMobile) setIsOpen(false);
                  }}
                >
                  All Categories
                </Button>
                {visibleCategories.map((category: any) => (
                  <Button
                    key={category.id}
                    variant={activeCategory === category.slug ? "secondary" : "ghost"}
                    className="w-full justify-start text-sm"
                    onClick={() => {
                      const params = new URLSearchParams(searchParams.toString());
                      params.set("category", category.slug);
                      router.push(`/forum?${params.toString()}`);
                      if (isMobile) setIsOpen(false);
                    }}
                  >
                    <div className="flex items-center gap-2 w-full">
                      {category.icon && <span>{category.icon}</span>}
                      <span className="flex-1 text-left">{category.name}</span>
                      {category.color && (
                        <Badge
                          className={cn(
                            "h-2.5 w-2.5 rounded-full p-0 border",
                            getCategoryColor(category.color)
                          )}
                          style={category.color ? {
                            backgroundColor: `${category.color}60`,
                            borderColor: category.color,
                          } : undefined}
                        />
                      )}
                    </div>
                  </Button>
                ))}
                {hasMoreCategories && (
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-sm text-muted-foreground"
                    onClick={() => setCategoriesExpanded(!categoriesExpanded)}
                  >
                    {categoriesExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        <span>Show Less</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        <span>Show {categories.length - 10} More</span>
                      </>
                    )}
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No categories yet</p>
            )}
          </div>
        )}

        {/* Trending Topics */}
        {!isCollapsed && (
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Trending</h3>
            </div>
            {trendingData?.topics && trendingData.topics.length > 0 ? (
              <div className="space-y-2">
                {trendingData.topics.map((topic: any, index: number) => (
                  <Link
                    key={topic.id || index}
                    href={`/forum?tag=${encodeURIComponent(topic.tag)}`}
                    className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
                    onClick={() => isMobile && setIsOpen(false)}
                  >
                    <div className="flex items-center gap-2">
                      <Hash className="h-3 w-3" />
                      <span>{topic.tag}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No trending topics</p>
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  if (isMobile) {
    return (
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="left" className="w-[280px] p-0">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={cn(
        "border-r bg-background transition-all duration-300 flex-shrink-0 h-screen fixed top-0 left-0 z-20",
        isCollapsed ? "w-16" : "w-64"
      )}
      style={{ top: '65px', height: 'calc(100vh - 65px)' }}
    >
      {sidebarContent}
    </aside>
  );
}

