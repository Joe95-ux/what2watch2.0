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
  Heart,
  List,
  LayoutDashboard,
  Settings,
  Palette,
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
import { useUser } from "@clerk/nextjs";
import { useFavorites } from "@/hooks/use-favorites";
import { usePlaylists } from "@/hooks/use-playlists";
import { useRecentlyViewed } from "@/hooks/use-recently-viewed";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { setTheme, theme } = useTheme();
  const { user } = useUser();
  const { data: favorites = [] } = useFavorites();
  const { data: playlists = [] } = usePlaylists();
  const { data: recentlyViewed = [] } = useRecentlyViewed();

  // User links
  const userLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/my-list", label: "My List", icon: Heart, badge: favorites.length },
    { href: "/playlists", label: "Playlists", icon: List, badge: playlists.length },
  ];

  return (
    <SidebarProvider>
      <Sidebar topOffset={65}>
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-2">
            <SidebarTrigger />
          </div>
        </SidebarHeader>
        <SidebarContent>
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
                      <SidebarMenuButton asChild isActive={isActive}>
                        <Link href={item.href} className="flex items-center w-full">
                          <Icon />
                          <span>{item.label}</span>
                          {item.badge !== undefined && item.badge > 0 && (
                            <span className="ml-auto text-xs font-medium bg-primary text-primary-foreground rounded-full px-2 py-0.5 min-w-[1.5rem] text-center">
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
                  <SidebarMenuButton asChild isActive={pathname === "/settings"}>
                    <Link href="/settings">
                      <Settings />
                      <span>Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
                <SidebarMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton>
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
                  <SidebarMenuButton disabled>
                    <Palette />
                    <span>Customize</span>
                    <span className="ml-auto text-xs text-muted-foreground">Soon</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          {/* Create Playlist CTA */}
          <div className="p-4 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-lg mx-2 mb-2">
            <Link href="/playlists">
              <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
                <List className="mr-2 h-4 w-4" />
                Create Playlist
              </Button>
            </Link>
          </div>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}

