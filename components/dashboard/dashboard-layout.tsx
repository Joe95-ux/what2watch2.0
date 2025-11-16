"use client";

import { ReactNode } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Home,
  Film,
  Tv,
  MessageSquare,
  Heart,
  List,
  LayoutDashboard,
  Settings,
  Palette,
  BarChart3,
  Plus,
  Sparkles,
  Activity,
  Users,
  UserPlus,
  UserRound,
  BookOpen,
  Bookmark,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Monitor } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useFavorites } from "@/hooks/use-favorites";
import { useWatchlist } from "@/hooks/use-watchlist";
import { usePlaylists } from "@/hooks/use-playlists";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { setTheme, theme } = useTheme();
  const { data: favorites = [] } = useFavorites();
  const { data: watchlist = [] } = useWatchlist();
  const { data: playlists = [] } = usePlaylists();

  // General navigation items
  const generalNavItems = [
    { href: "/browse", label: "Browse", icon: Home },
    { href: "/movies", label: "Movies", icon: Film },
    { href: "/tv", label: "TV Shows", icon: Tv },
    { href: "/forums", label: "Forums", icon: MessageSquare },
  ];

  // User links
  const userLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/my-list", label: "My List", icon: Heart, badge: favorites.length },
    { href: "/dashboard/watchlist", label: "Watchlist", icon: Bookmark, badge: watchlist.length },
    { href: "/playlists", label: "Playlists", icon: List, badge: playlists.length },
    { href: "/dashboard/diary", label: "Diary", icon: BookOpen },
    { href: "/dashboard/diary/stats", label: "Diary Stats", icon: BarChart3 },
    { href: "/dashboard/my-stats", label: "My Stats", icon: BarChart3 },
  ];

  return (
    <SidebarProvider>
      <Sidebar topOffset={65} collapsible="icon">
        <SidebarHeader>
          <SidebarTrigger />
        </SidebarHeader>
        <SidebarContent className="flex flex-col overflow-hidden">
          <ScrollArea className="flex-1 overflow-x-hidden">
            <div className="pr-2">
              {/* General Navigation */}
              <SidebarGroup>
                <SidebarGroupLabel>Navigation</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {generalNavItems.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                            <Link href={item.href}>
                              <Icon />
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              <SidebarSeparator />

              {/* User Links */}
              <SidebarGroup>
                <SidebarGroupLabel>My Content</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {userLinks.map((item) => {
                      const Icon = item.icon;
                      // For Dashboard, only match exactly /dashboard, not /dashboard/*
                      // For other routes, match exact path or paths starting with href + "/"
                      // But exclude child routes that have their own menu items
                      let isActive = false;
                      if (item.href === "/dashboard") {
                        isActive = pathname === item.href;
                      } else {
                        // Check if pathname matches exactly
                        if (pathname === item.href) {
                          isActive = true;
                        } else if (pathname?.startsWith(item.href + "/")) {
                          // Check if there's a more specific route that should be active instead
                          const moreSpecificRoute = userLinks.find(
                            (otherItem) => 
                              otherItem.href !== item.href && 
                              (pathname === otherItem.href || pathname?.startsWith(otherItem.href + "/")) &&
                              otherItem.href.startsWith(item.href + "/")
                          );
                          // Only mark as active if there's no more specific route
                          isActive = !moreSpecificRoute;
                        }
                      }
                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                            <Link href={item.href} className="flex items-center w-full">
                              <Icon />
                              <span>{item.label}</span>
                              {item.badge !== undefined && item.badge > 0 && (
                                <span className="ml-auto text-xs font-medium bg-primary text-primary-foreground rounded-full px-2 py-0.5 min-w-[1.5rem] text-center group-data-[collapsible=icon]:hidden">
                                  {item.badge}
                                </span>
                              )}
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname === "/dashboard/profile"} tooltip="Profile">
                        <Link href="/dashboard/profile">
                          <UserRound />
                          <span>Profile</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              <SidebarSeparator />

              {/* Social Group */}
              <SidebarGroup>
                <SidebarGroupLabel>Social</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={
                          pathname === "/dashboard/social" ||
                          (pathname?.startsWith("/dashboard/social/") &&
                            !pathname?.startsWith("/dashboard/social/friends-playlists"))
                        }
                        tooltip="Following"
                      >
                        <Link href="/dashboard/social">
                          <Users />
                          <span>Following</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={
                          pathname === "/dashboard/social/friends-playlists" ||
                          pathname?.startsWith("/dashboard/social/friends-playlists/")
                        }
                        tooltip="Friends' Playlists"
                      >
                        <Link href="/dashboard/social/friends-playlists">
                          <UserPlus />
                          <span>Friends&apos; Playlists</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              <SidebarSeparator />

              {/* AI Assistant Group */}
              <SidebarGroup>
                <SidebarGroupLabel>AI Assistant</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === "/dashboard/ai/discover" || pathname?.startsWith("/dashboard/ai/discover")}
                        tooltip="Discover"
                      >
                        <Link href="/dashboard/ai/discover">
                          <Sparkles />
                          <span>Discover</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === "/dashboard/ai/usage" || pathname?.startsWith("/dashboard/ai/usage")}
                        tooltip="AI Usage"
                      >
                        <Link href="/dashboard/ai/usage">
                          <Activity />
                          <span>AI Usage</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              <SidebarSeparator />

              {/* Settings Group */}
              <SidebarGroup>
                <SidebarGroupLabel>Settings</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname === "/settings"} tooltip="Settings">
                        <Link href="/settings">
                          <Settings />
                          <span>Settings</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <SidebarMenuButton tooltip="Theme">
                            {theme === "light" ? (
                              <Sun />
                            ) : theme === "dark" ? (
                              <Moon />
                            ) : (
                              <Monitor />
                            )}
                            <span>Theme</span>
                          </SidebarMenuButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" side="right">
                          <DropdownMenuItem onClick={() => setTheme("light")}>
                            <Sun className="mr-2 h-4 w-4" />
                            <span>Light</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setTheme("dark")}>
                            <Moon className="mr-2 h-4 w-4" />
                            <span>Dark</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setTheme("system")}>
                            <Monitor className="mr-2 h-4 w-4" />
                            <span>System</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton disabled tooltip="Customize">
                        <Palette />
                        <span>Customize</span>
                        <span className="ml-auto text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">Soon</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </div>
          </ScrollArea>
        </SidebarContent>


        <SidebarFooter className="flex-shrink-0 pt-2 border-t">
          {/* Create Playlist CTA */}
          <Link href="/playlists" className="group block cursor-pointer group-data-[collapsible=icon]:hidden">
            <Button
              className="cta-shine animate-gradient-slow relative w-full overflow-hidden bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white transition-all duration-300 ease-out shadow-[0_18px_42px_-24px_rgba(168,85,247,0.7)] hover:scale-[1.02] hover:shadow-[0_22px_48px_-18px_rgba(236,72,153,0.75)] focus-visible:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="size-5 mr-2 transition-transform duration-300 group-hover:rotate-90" />
              <span className="font-semibold tracking-wide">Create Playlist</span>
            </Button>
          </Link>
          {/* Collapsed CTA - icon only */}
          <div className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2">
            <Link href="/playlists" className="cursor-pointer">
              <Plus className="size-6 text-purple-600 dark:text-purple-400 transition-all duration-300 hover:rotate-90 hover:scale-110" />
            </Link>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="overflow-x-hidden min-w-0">
        <div className="w-full min-w-0">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

