"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser, SignInButton, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Settings, LogOut, Moon, Sun, Monitor, ChevronRight, Bell, LayoutDashboard, Compass, UserCircle } from "lucide-react";
import { Youtube } from "lucide-react";
import { cn } from "@/lib/utils";
import { useForumNotifications } from "@/hooks/use-forum-notifications";
import { useYouTubeNotifications } from "@/hooks/use-youtube-notifications";
import { UnifiedNotificationCenterMobile } from "@/components/notifications/unified-notification-center-mobile";
import { AvatarEditorDialog } from "@/components/avatar/avatar-editor-dialog";

interface MobileNavProps {
  navLinks: Array<{ href: string; label: string }>;
  pathname: string;
  onLinkClick: () => void;
}

export default function MobileNav({ navLinks, pathname, onLinkClick }: MobileNavProps) {
  const { isSignedIn, user } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const { setTheme, theme } = useTheme();
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isAvatarEditorOpen, setIsAvatarEditorOpen] = useState(false);

  // Get unread notification counts
  const { data: forumData } = useForumNotifications(false);
  const { data: youtubeData } = useYouTubeNotifications(false);
  const forumUnreadCount = forumData?.unreadCount || 0;
  const youtubeUnreadCount = youtubeData?.unreadCount || 0;
  const totalUnreadCount = forumUnreadCount + youtubeUnreadCount;

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    onLinkClick();
  };

  return (
    <div className="flex flex-col">
      {/* Navigation Links - Styled like DropdownMenu */}
      <div className="p-1">
        {navLinks.map((link) => {
          // For forum, match exact path or paths starting with /forum/
          const isActive = link.href === "/forum" 
            ? pathname === link.href || pathname?.startsWith(link.href + "/")
            : pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onLinkClick}
              className={cn(
                "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                "focus:bg-accent focus:text-accent-foreground",
                "hover:bg-accent hover:text-accent-foreground",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              {link.label}
            </Link>
          );
        })}
        {isSignedIn && (
          <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
            <SheetTrigger asChild>
              <button
                className={cn(
                  "relative mt-1 flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                  "focus:bg-accent focus:text-accent-foreground",
                  "hover:bg-accent hover:text-accent-foreground",
                  "text-muted-foreground"
                )}
              >
                <Bell className="mr-2 h-4 w-4" />
                <span>Notifications</span>
                {totalUnreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-auto h-5 min-w-5 px-1.5 flex items-center justify-center text-xs"
                  >
                    {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
                  </Badge>
                )}
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:w-[400px] p-0 flex flex-col">
              <UnifiedNotificationCenterMobile onClose={() => setNotificationsOpen(false)} />
            </SheetContent>
          </Sheet>
        )}
      </div>

      {/* User Menu Items (only shown when signed in) */}
      {isSignedIn && (
        <>
          <Separator className="my-1" />
          <div className="p-1">
            <Link
              href="/dashboard"
              onClick={onLinkClick}
              className={cn(
                "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                "focus:bg-accent focus:text-accent-foreground",
                "hover:bg-accent hover:text-accent-foreground",
                pathname === "/dashboard"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/browse/personalized"
              onClick={onLinkClick}
              className={cn(
                "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                "focus:bg-accent focus:text-accent-foreground",
                "hover:bg-accent hover:text-accent-foreground",
                pathname === "/browse/personalized"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              <Compass className="mr-2 h-4 w-4" />
              <span>Guide</span>
            </Link>
            <Link
              href="/settings"
              onClick={onLinkClick}
              className={cn(
                "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                "focus:bg-accent focus:text-accent-foreground",
                "hover:bg-accent hover:text-accent-foreground",
                pathname === "/settings"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </Link>
            <button
              onClick={() => {
                setIsAvatarEditorOpen(true);
                onLinkClick();
              }}
              className={cn(
                "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                "focus:bg-accent focus:text-accent-foreground",
                "hover:bg-accent hover:text-accent-foreground",
                "text-muted-foreground"
              )}
            >
              <UserCircle className="mr-2 h-4 w-4" />
              <span>Edit Avatar</span>
            </button>

            {/* Theme Toggle - Collapsible */}
            <div className="relative">
              <button
                onClick={() => setIsThemeOpen(!isThemeOpen)}
                className={cn(
                  "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                  "focus:bg-accent focus:text-accent-foreground",
                  "hover:bg-accent hover:text-accent-foreground",
                  isThemeOpen
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
              >
                {theme === "light" ? (
                  <Sun className="mr-2 h-4 w-4" />
                ) : theme === "dark" ? (
                  <Moon className="mr-2 h-4 w-4" />
                ) : (
                  <Monitor className="mr-2 h-4 w-4" />
                )}
                <span>Theme</span>
                <ChevronRight
                  className={cn(
                    "ml-auto h-4 w-4 transition-transform duration-200",
                    isThemeOpen && "rotate-90"
                  )}
                />
              </button>
              {isThemeOpen && (
                <div className="ml-4 mt-1 space-y-0.5">
                  <button
                    onClick={() => {
                      setTheme("light");
                      onLinkClick();
                    }}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                      "focus:bg-accent focus:text-accent-foreground",
                      "hover:bg-accent hover:text-accent-foreground",
                      theme === "light"
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <Sun className="mr-2 h-4 w-4" />
                    <span>Light</span>
                  </button>
                  <button
                    onClick={() => {
                      setTheme("dark");
                      onLinkClick();
                    }}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                      "focus:bg-accent focus:text-accent-foreground",
                      "hover:bg-accent hover:text-accent-foreground",
                      theme === "dark"
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <Moon className="mr-2 h-4 w-4" />
                    <span>Dark</span>
                  </button>
                  <button
                    onClick={() => {
                      setTheme("system");
                      onLinkClick();
                    }}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                      "focus:bg-accent focus:text-accent-foreground",
                      "hover:bg-accent hover:text-accent-foreground",
                      theme === "system"
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground"
                    )}
                  >
                    <Monitor className="mr-2 h-4 w-4" />
                    <span>System</span>
                  </button>
                </div>
              )}
            </div>

            <Separator className="my-1" />

            <Link href="/dashboard/youtube/management" onClick={onLinkClick}>
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer">
                <Youtube className="h-4 w-4" />
                <span>YouTube Management</span>
              </div>
            </Link>

            <Separator className="my-1" />

            <button
              onClick={handleSignOut}
              className={cn(
                "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
                "focus:bg-accent focus:text-accent-foreground",
                "hover:bg-accent hover:text-accent-foreground",
                "text-destructive focus:text-destructive"
              )}
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </button>
          </div>
        </>
      )}

      {/* Avatar Editor Dialog */}
      {isSignedIn && (
        <AvatarEditorDialog
          isOpen={isAvatarEditorOpen}
          onClose={() => setIsAvatarEditorOpen(false)}
          currentAvatarUrl={user?.imageUrl}
        />
      )}

      {/* Auth Section */}
      {!isSignedIn && (
        <>
          <Separator className="my-1" />
          <div className="p-1">
            <SignInButton mode="modal">
              <Button className="w-full" onClick={onLinkClick} variant="default">
                Sign In
              </Button>
            </SignInButton>
          </div>
        </>
      )}
    </div>
  );
}
