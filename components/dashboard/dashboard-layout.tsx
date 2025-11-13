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
import { usePlaylists } from "@/hooks/use-playlists";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { setTheme, theme } = useTheme();
  const { data: favorites = [] } = useFavorites();
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
    { href: "/playlists", label: "Playlists", icon: List, badge: playlists.length },
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
                      const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
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

        <SidebarFooter className="flex-shrink-0">
          {/* Create Playlist CTA */}
          <Link href="/playlists" className="group block">
            <Button
              className="cta-shine animate-gradient-slow relative w-full overflow-hidden bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white transition-all duration-300 ease-out shadow-[0_18px_42px_-24px_rgba(168,85,247,0.7)] hover:-translate-y-1 hover:shadow-[0_22px_48px_-18px_rgba(236,72,153,0.75)] focus-visible:scale-[1.02] active:translate-y-0"
            >
              <Plus className="size-5 mr-2 transition-transform duration-300 group-hover:rotate-90" />
              <span className="font-semibold tracking-wide">Create Playlist</span>
            </Button>
          </Link>
          {/* Collapsed CTA - icon only */}
          <div className="hidden group-data-[collapsible=icon]:block p-2">
            <Link href="/playlists" className="block">
              <Button
                size="icon"
                className="cta-shine animate-gradient-slow group relative h-10 w-10 overflow-hidden rounded-full bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 text-white transition-all duration-300 ease-out shadow-[0_18px_42px_-24px_rgba(168,85,247,0.7)] hover:-translate-y-1 hover:shadow-[0_22px_48px_-18px_rgba(236,72,153,0.75)] focus-visible:scale-[1.05] active:translate-y-0"
              >
                <Plus className="size-5 transition-transform duration-300 group-hover:rotate-90" />
              </Button>
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

