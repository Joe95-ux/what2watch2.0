"use client";

import { ReactNode, forwardRef } from "react";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import Link, { LinkProps } from "next/link";
import {
  Home,
  Film,
  Tv,
  Heart,
  List,
  LayoutDashboard,
  Settings,
  Activity,
  Palette,
  BarChart3,
  Sparkles,
  Users,
  UserPlus,
  UserRound,
  BookOpen,
  Bookmark,
  ClipboardList,
  Youtube,
  Bell,
  Shield,
  MessageSquare,
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
import { useCurrentUser } from "@/hooks/use-current-user";
import { useClerk } from "@clerk/nextjs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DashboardSubnav } from "./dashboard-subnav";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { setTheme, theme } = useTheme();
  const { data: favorites = [] } = useFavorites();
  const { data: watchlist = [] } = useWatchlist();
  const { data: playlists = [] } = usePlaylists();
  const { data: currentUser } = useCurrentUser();
  const { openUserProfile } = useClerk();

  // General navigation items
  const generalNavItems = [
    { href: "/browse", label: "Browse", icon: Home },
    { href: "/popular?type=movies", label: "Movies", icon: Film },
    { href: "/popular?type=tv", label: "TV Shows", icon: Tv },
    { href: "/forum", label: "Forum", icon: MessageSquare },
    { href: "/youtube", label: "YouTube", icon: Youtube },
  ];

  // User links
  const userLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/dashboard/activity", label: "Activity", icon: Activity },
    { href: "/dashboard/my-list", label: "My List", icon: Heart, badge: favorites.length },
    { href: "/dashboard/watchlist", label: "Watchlist", icon: Bookmark, badge: watchlist.length },
    { href: "/dashboard/playlists", label: "Playlists", icon: List, badge: playlists.length },
    { href: "/dashboard/lists", label: "Lists", icon: ClipboardList },
    { href: "/dashboard/diary", label: "Diary", icon: BookOpen },
    { href: "/dashboard/diary/stats", label: "Diary Stats", icon: BarChart3 },
    { href: "/dashboard/my-stats", label: "My Stats", icon: BarChart3 },
    { href: "/dashboard/reports", label: "Reports", icon: MessageSquare },
  ];

  // YouTube links
  const youtubeLinks = [
    { href: "/dashboard/youtube", label: "YouTube Dashboard", icon: Youtube },
    { href: "/dashboard/youtube/search", label: "Search", icon: Youtube },
    { href: "/dashboard/youtube/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/dashboard/youtube/notifications", label: "Notifications", icon: Bell },
    { href: "/dashboard/youtube/management", label: "Channel Management", icon: Settings },
  ];

  // Admin links (only show if user is admin)
  const isAdmin = currentUser?.isForumAdmin || currentUser?.role === "ADMIN" || currentUser?.role === "SUPER_ADMIN";
  const adminLinks = isAdmin ? [
    { href: "/dashboard/admin/forum", label: "Forum Admin", icon: MessageSquare },
    { href: "/dashboard/admin/moderation", label: "General Moderation", icon: Shield },
  ] : [];

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
                            <SidebarNavLink href={item.href}>
                              <Icon />
                              <span>{item.label}</span>
                            </SidebarNavLink>
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
                        <SidebarNavLink
                          href={item.href}
                          className="flex items-center w-full"
                        >
                              <Icon />
                              <span>{item.label}</span>
                              {item.badge !== undefined && item.badge > 0 && (
                                <span className="ml-auto text-xs font-medium bg-primary text-primary-foreground rounded-full px-2 py-0.5 min-w-[1.5rem] text-center group-data-[collapsible=icon]:hidden">
                                  {item.badge}
                                </span>
                              )}
                        </SidebarNavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={pathname === "/dashboard/profile"} tooltip="Profile">
                    <SidebarNavLink href="/dashboard/profile">
                          <UserRound />
                          <span>Profile</span>
                    </SidebarNavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              <SidebarSeparator />

              {/* YouTube Group */}
              <SidebarGroup>
                <SidebarGroupLabel>YouTube</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {youtubeLinks.map((item) => {
                      const Icon = item.icon;
                      // Check if pathname matches exactly
                      let isActive = false;
                      if (pathname === item.href) {
                        isActive = true;
                      } else if (pathname?.startsWith(item.href + "/")) {
                        // Check if there's a more specific route that should be active instead
                        const moreSpecificRoute = youtubeLinks.find(
                          (otherItem) => 
                            otherItem.href !== item.href && 
                            (pathname === otherItem.href || pathname?.startsWith(otherItem.href + "/")) &&
                            otherItem.href.startsWith(item.href + "/")
                        );
                        // Only mark as active if there's no more specific route
                        isActive = !moreSpecificRoute;
                      }
                      return (
                        <SidebarMenuItem key={item.href}>
                          <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                            <SidebarNavLink
                              href={item.href}
                              className="flex items-center w-full"
                            >
                              <Icon />
                              <span>{item.label}</span>
                            </SidebarNavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              {/* Admin Group - Only show if user is admin */}
              {isAdmin && adminLinks.length > 0 && (
                <>
                  <SidebarSeparator />
                  <SidebarGroup>
                    <SidebarGroupLabel>Admin</SidebarGroupLabel>
                    <SidebarGroupContent>
                      <SidebarMenu>
                        {adminLinks.map((item) => {
                          const Icon = item.icon;
                          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                          return (
                            <SidebarMenuItem key={item.href}>
                              <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                                <SidebarNavLink href={item.href}>
                                  <Icon />
                                  <span>{item.label}</span>
                                </SidebarNavLink>
                              </SidebarMenuButton>
                            </SidebarMenuItem>
                          );
                        })}
                      </SidebarMenu>
                    </SidebarGroupContent>
                  </SidebarGroup>
                </>
              )}

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
                        <SidebarNavLink href="/dashboard/social">
                          <Users />
                          <span>Following</span>
                        </SidebarNavLink>
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
                        <SidebarNavLink href="/dashboard/social/friends-playlists">
                          <UserPlus />
                          <span>Friends&apos; Playlists</span>
                        </SidebarNavLink>
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
                        <SidebarNavLink href="/dashboard/ai/discover">
                          <Sparkles />
                          <span>Discover</span>
                        </SidebarNavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        isActive={pathname === "/dashboard/ai/usage" || pathname?.startsWith("/dashboard/ai/usage")}
                        tooltip="AI Usage"
                      >
                        <SidebarNavLink href="/dashboard/ai/usage">
                          <Activity />
                          <span>AI Usage</span>
                        </SidebarNavLink>
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
                        <SidebarNavLink href="/settings">
                          <Settings />
                          <span>Settings</span>
                        </SidebarNavLink>
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
          {/* User Profile Footer - Expanded */}
          <div className="group-data-[collapsible=icon]:hidden flex items-center justify-between gap-2 p-2">
            {/* Left: User Avatar | Username and Online Status */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="relative flex-shrink-0">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={currentUser?.avatarUrl || undefined} alt={currentUser?.displayName || ""} />
                  <AvatarFallback>
                    {(currentUser?.displayName || currentUser?.username || "U")[0].toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {/* Online Status Indicator */}
                <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <p className="text-sm font-medium truncate">
                  {currentUser?.displayName || currentUser?.username || "User"}
                </p>
                <p className="text-xs text-muted-foreground">Online</p>
              </div>
            </div>
            
            {/* Right: Settings Icon */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0 cursor-pointer"
              onClick={() => openUserProfile()}
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
          
          {/* User Profile Footer - Collapsed (Avatar Only) */}
          <div className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-2">
            <div className="relative">
              <Avatar className="h-8 w-8 cursor-pointer" onClick={() => openUserProfile()}>
                <AvatarImage src={currentUser?.avatarUrl || undefined} alt={currentUser?.displayName || ""} />
                <AvatarFallback>
                  {(currentUser?.displayName || currentUser?.username || "U")[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {/* Online Status Indicator */}
              <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background" />
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset className="overflow-x-hidden min-w-0">
        {/* Dashboard Subnav - Fixed under navbar */}
        <DashboardSubnav />
        {/* Add padding-top to account for fixed subnav */}
        <div className="w-full min-w-0 pt-12">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

type SidebarNavLinkProps = LinkProps &
  React.ComponentPropsWithoutRef<"a">;

const SidebarNavLink = forwardRef<HTMLAnchorElement, SidebarNavLinkProps>(
  ({ className, onClick, ...props }, ref) => {
    const { setOpenMobile } = useSidebar();

    return (
      <Link
        ref={ref}
        className={className}
        {...props}
        onClick={(event) => {
          onClick?.(event);
          setOpenMobile(false);
        }}
      />
    );
  }
);

SidebarNavLink.displayName = "SidebarNavLink";

