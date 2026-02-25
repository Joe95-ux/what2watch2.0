"use client";

import { useState } from "react";
import Link from "next/link";
import { useUser, SignInButton, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetClose, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Settings, LogOut, Moon, Sun, Monitor, ChevronRight, Bell, LayoutDashboard, Compass, UserRound, X, Megaphone, Bookmark, List, BookOpen, ClipboardList, TrendingUp, UsersRound, MessageSquare, Youtube as YoutubeIcon, Search, BarChart3, Sparkles, ChevronDown, Target, Stethoscope, Lightbulb, BellIcon, MessageSquare as MessageSquareIcon, Award } from "lucide-react";
import { Youtube } from "lucide-react";
import { cn } from "@/lib/utils";
import { useForumNotifications } from "@/hooks/use-forum-notifications";
import { useYouTubeNotifications } from "@/hooks/use-youtube-notifications";
import { useGeneralNotifications } from "@/hooks/use-general-notifications";
import { useYouTubeToolsVisibility } from "@/hooks/use-youtube-tools-visibility";
import { UnifiedNotificationCenterMobile } from "@/components/notifications/unified-notification-center-mobile";
import Logo from "@/components/Logo";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface MobileNavProps {
  navLinks: Array<{ href: string; label: string }>;
  pathname: string;
  onLinkClick: () => void;
}

const YOUTUBE_URL = "https://www.youtube.com";

const youtubeNavItems = [
  { href: "/youtube", label: "Overview", icon: YoutubeIcon },
  { href: "/youtube/trends", label: "Trending Topics", icon: TrendingUp },
  { href: "/youtube/analyzer", label: "Title Analyzer", icon: BarChart3 },
  { href: "/youtube/gaps", label: "Content Gaps", icon: Target },
  { href: "/youtube/diagnostic", label: "Channel Diagnostic", icon: Stethoscope },
  { href: "/youtube/formats", label: "Format Inspiration", icon: Lightbulb },
  { href: "/youtube/questions", label: "Comment Questions", icon: MessageSquareIcon },
  { href: "/youtube/benchmarks", label: "Performance Benchmarks", icon: Award },
  { href: "/youtube/alerts", label: "Trend Alerts", icon: BellIcon },
  { href: "/youtube/insights", label: "Content Insights", icon: Sparkles },
];

export default function MobileNav({ navLinks, pathname, onLinkClick }: MobileNavProps) {
  const { isSignedIn } = useUser();
  const [youtubeExpanded, setYoutubeExpanded] = useState(false);
  const { data: youtubeVisibility } = useYouTubeToolsVisibility();
  const showSimpleYouTubeLink =
    youtubeVisibility?.mode === "HIDDEN_FROM_ALL" ||
    (youtubeVisibility?.mode === "INVITE_ONLY" && !youtubeVisibility?.hasAccess);
  const { signOut } = useClerk();
  const router = useRouter();
  const { setTheme, theme } = useTheme();
  const [isThemeOpen, setIsThemeOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackReason, setFeedbackReason] = useState("");
  const [feedbackPriority, setFeedbackPriority] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Get unread notification counts
  const { data: forumData } = useForumNotifications(false);
  const { data: youtubeData } = useYouTubeNotifications(false);
  const { data: generalData } = useGeneralNotifications(false);
  const forumUnreadCount = forumData?.unreadCount || 0;
  const youtubeUnreadCount = youtubeData?.unreadCount || 0;
  const generalUnreadCount = generalData?.unreadCount || 0;
  const totalUnreadCount = forumUnreadCount + youtubeUnreadCount + generalUnreadCount;

  const handleSignOut = async () => {
    await signOut();
    router.push("/browse");
    onLinkClick();
  };

  const handleFeedbackSubmit = async () => {
    if (!isSignedIn) {
      toast.error("Please sign in to submit feedback");
      return;
    }

    if (!feedbackReason || !feedbackPriority || !feedbackMessage.trim()) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsSubmittingFeedback(true);
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: feedbackReason,
          priority: feedbackPriority,
          message: feedbackMessage.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit feedback");
      }

      toast.success("Feedback submitted successfully!");
      setFeedbackReason("");
      setFeedbackPriority("");
      setFeedbackMessage("");
      setFeedbackOpen(false);
      onLinkClick();
    } catch (error) {
      console.error("[MobileNav] feedback submit error", error);
      toast.error("Failed to submit feedback. Please try again.");
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header with Logo and Close Button */}
      <SheetHeader className="flex flex-row items-center justify-between px-4 py-3 border-b">
        <div className="h-full">
          <Logo />
        </div>
        <SheetClose asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <X className="h-4 w-4" />
          </Button>
        </SheetClose>
      </SheetHeader>

      <div className="flex-1 overflow-y-auto scrollbar-thin px-4 py-6 pb-20 space-y-6">
        {/* First Section: Dashboard, Notifications, Feedback */}
        {isSignedIn && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Link 
                href="/dashboard" 
                onClick={(e) => {
                  e.preventDefault();
                  onLinkClick();
                  setTimeout(() => {
                    router.push("/dashboard");
                  }, 100);
                }} 
                className="flex-1"
              >
                <div className="flex flex-col items-center gap-2">
                    <div className="rounded-full bg-muted/85 dark:bg-muted/50 p-3">
                      <LayoutDashboard className="h-5 w-5 text-foreground" />
                    </div>
                  <span className="text-xs font-medium">Dashboard</span>
                </div>
              </Link>
              
              <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                <SheetTrigger asChild>
                  <button className="flex-1">
                    <div className="flex flex-col items-center gap-2">
                        <div className="rounded-full bg-muted/85 dark:bg-muted/50 p-3 relative">
                          <Bell className="h-5 w-5 text-foreground" />
                          {totalUnreadCount > 0 && (
                            <Badge
                              variant="destructive"
                              className="absolute -top-1 -right-1 h-4 min-w-4 px-1 flex items-center justify-center text-[10px]"
                            >
                              {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
                            </Badge>
                          )}
                        </div>
                      <span className="text-xs font-medium">Notifications</span>
                    </div>
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-full sm:w-[400px] p-0 flex flex-col">
                  <UnifiedNotificationCenterMobile onClose={() => setNotificationsOpen(false)} />
                </SheetContent>
              </Sheet>

              <Popover open={feedbackOpen} onOpenChange={setFeedbackOpen}>
                <PopoverTrigger asChild>
                  <button className="flex-1">
                    <div className="flex flex-col items-center gap-2">
                      <div className="rounded-full bg-muted/85 dark:bg-muted/50 p-3">
                        <Megaphone className="h-5 w-5 text-foreground" />
                      </div>
                      <span className="text-xs font-medium">Feedback</span>
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-[90vw] max-w-[400px] p-4" align="center">
                  <div className="space-y-4">
                    <h3 className="font-semibold">Feedback</h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Reason</Label>
                        <Select value={feedbackReason} onValueChange={setFeedbackReason}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select reason" />
                          </SelectTrigger>
                          <SelectContent>
                            {["Bug Report", "Feature Request", "UI/UX Issue", "Performance Issue", "Content Issue", "Account Issue", "Other"].map((r) => (
                              <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Priority</Label>
                        <Select value={feedbackPriority} onValueChange={setFeedbackPriority}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select priority" />
                          </SelectTrigger>
                          <SelectContent>
                            {["Low", "Medium", "High", "Urgent"].map((p) => (
                              <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Message</Label>
                      <Textarea
                        placeholder="Describe your feedback..."
                        value={feedbackMessage}
                        onChange={(e) => setFeedbackMessage(e.target.value)}
                        className="min-h-[100px]"
                        maxLength={2000}
                      />
                      <div className="text-xs text-muted-foreground text-right">
                        {feedbackMessage.length}/2000
                      </div>
                    </div>
                    <Button
                      onClick={handleFeedbackSubmit}
                      disabled={isSubmittingFeedback || !feedbackReason || !feedbackPriority || !feedbackMessage.trim()}
                      className="w-full"
                    >
                      {isSubmittingFeedback ? "Submitting..." : "Submit Feedback"}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}

        {/* Second Section: Watchlist, Lists, Playlists, Diary */}
        {isSignedIn && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Link 
                href="/dashboard/watchlist" 
                onClick={(e) => {
                  e.preventDefault();
                  onLinkClick();
                  setTimeout(() => {
                    router.push("/dashboard/watchlist");
                  }, 100);
                }}
              >
                <div className="flex flex-col items-center gap-2 p-3 rounded-md bg-muted/85 dark:bg-muted/50 hover:bg-muted transition-colors">
                  <Bookmark className="h-5 w-5 text-foreground" />
                  <span className="text-xs font-medium">Watchlist</span>
                </div>
              </Link>
              <Link 
                href="/lists" 
                onClick={(e) => {
                  e.preventDefault();
                  onLinkClick();
                  setTimeout(() => {
                    router.push("/lists");
                  }, 100);
                }}
              >
                <div className="flex flex-col items-center gap-2 p-3 rounded-md bg-muted/85 dark:bg-muted/50 hover:bg-muted transition-colors">
                  <ClipboardList className="h-5 w-5 text-foreground" />
                  <span className="text-xs font-medium">Lists</span>
                </div>
              </Link>
              <Link 
                href="/dashboard/playlists" 
                onClick={(e) => {
                  e.preventDefault();
                  onLinkClick();
                  setTimeout(() => {
                    router.push("/dashboard/playlists");
                  }, 100);
                }}
              >
                <div className="flex flex-col items-center gap-2 p-3 rounded-md bg-muted/85 dark:bg-muted/50 hover:bg-muted transition-colors">
                  <List className="h-5 w-5 text-foreground" />
                  <span className="text-xs font-medium">Playlists</span>
                </div>
              </Link>
              <Link 
                href="/dashboard/diary" 
                onClick={(e) => {
                  e.preventDefault();
                  onLinkClick();
                  setTimeout(() => {
                    router.push("/dashboard/diary");
                  }, 100);
                }}
              >
                <div className="flex flex-col items-center gap-2 p-3 rounded-md bg-muted/85 dark:bg-muted/50 hover:bg-muted transition-colors">
                  <BookOpen className="h-5 w-5 text-foreground" />
                  <span className="text-xs font-medium">Diary</span>
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <div className="space-y-2">
          {navLinks.flatMap((link) => {
            const isActive = link.href === "/forum" 
              ? pathname === link.href || pathname?.startsWith(link.href + "/")
              : link.href === "/forum"
              ? pathname === link.href || pathname?.startsWith(link.href + "/")
              : pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href + "/"));
            
            // Get icon for each link
            const getIcon = () => {
              // Icons should be brighter than labels (text-foreground is brighter than text-muted-foreground)
              const iconColor = "text-foreground";
              switch (link.href) {
                case "/browse":
                  return <Search className={cn("mr-3 h-4 w-4", iconColor)} />;
                case "/popular":
                  return <TrendingUp className={cn("mr-3 h-4 w-4", iconColor)} />;
                case "/lists":
                  return <ClipboardList className={cn("mr-3 h-4 w-4", iconColor)} />;
                case "/members":
                  return <UsersRound className={cn("mr-3 h-4 w-4", iconColor)} />;
                case "/forum":
                case "/forum":
                  return <MessageSquare className={cn("mr-3 h-4 w-4", iconColor)} />;
                default:
                  return null;
              }
            };
            
            const linkElement = (
              <Link
                key={link.href}
                href={link.href}
                onClick={(e) => {
                  e.preventDefault();
                  onLinkClick();
                  setTimeout(() => {
                    router.push(link.href);
                  }, 100);
                }}
                className={cn(
                  "flex items-center rounded-md px-3 py-2.5 bg-muted/85 dark:bg-muted/50 hover:bg-muted transition-colors",
                  "text-[0.95rem]",
                  isActive ? "bg-muted text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                {getIcon()}
                <span>{link.label}</span>
              </Link>
            );
            // Guide comes right after Popular in the mobile menu
            if (link.href === "/popular") {
              return [
                linkElement,
                <Link
                  key="/browse/personalized"
                  href="/browse/personalized"
                  onClick={(e) => {
                    e.preventDefault();
                    onLinkClick();
                    setTimeout(() => {
                      router.push("/browse/personalized");
                    }, 100);
                  }}
                  className={cn(
                    "flex items-center rounded-md px-3 py-2.5 bg-muted/85 dark:bg-muted/50 hover:bg-muted transition-colors text-[0.95rem]",
                    pathname === "/browse/personalized" || pathname?.startsWith("/browse/personalized")
                      ? "bg-muted text-foreground font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  <Compass className="mr-3 h-4 w-4 text-foreground" />
                  <span>Guide</span>
                </Link>,
              ];
            }
            return [linkElement];
          })}
          
          {/* YouTube: simple link or tools list */}
          <div className="space-y-1">
            {showSimpleYouTubeLink ? (
              <a
                href="/youtube"
                className="flex items-center rounded-md px-3 py-2.5 bg-muted/85 dark:bg-muted/50 hover:bg-muted transition-colors text-[0.95rem] text-muted-foreground"
                onClick={(e) => {
                  e.preventDefault();
                  onLinkClick();
                  setTimeout(() => {
                    router.push("/youtube");
                  }, 100);
                }}
              >
                <YoutubeIcon className="mr-3 h-4 w-4 text-foreground" />
                <span>YouTube</span>
              </a>
            ) : (
              <>
                <button
                  onClick={() => setYoutubeExpanded(!youtubeExpanded)}
                  className={cn(
                    "flex items-center justify-between w-full rounded-md px-3 py-2.5 bg-muted/85 dark:bg-muted/50 hover:bg-muted transition-colors text-[0.95rem]",
                    (pathname === "/youtube" || pathname?.startsWith("/youtube/"))
                      ? "bg-muted text-foreground font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  <div className="flex items-center">
                    <YoutubeIcon className="mr-3 h-4 w-4 text-foreground" />
                    <span>YouTube</span>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 transition-transform",
                      youtubeExpanded && "rotate-180"
                    )}
                  />
                </button>
                {youtubeExpanded && (
                  <div className="ml-4 space-y-1">
                    {youtubeNavItems.map((item) => {
                      const Icon = item.icon;
                      const isActive =
                        pathname === item.href ||
                        (item.href !== "/youtube" && pathname?.startsWith(item.href));
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={(e) => {
                            e.preventDefault();
                            onLinkClick();
                            setTimeout(() => {
                              router.push(item.href);
                            }, 100);
                          }}
                          className={cn(
                            "flex items-center rounded-md px-3 py-2 bg-muted/60 dark:bg-muted/40 hover:bg-muted/50 transition-colors text-[0.9rem]",
                            isActive
                              ? "bg-muted/70 dark:bg-muted/60 text-foreground font-medium"
                              : "text-muted-foreground"
                          )}
                        >
                          <Icon className="mr-2 h-3.5 w-3.5 text-foreground" />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* User Menu Items (only shown when signed in) */}
        {isSignedIn && (
          <div className="space-y-2">
            <Link
              href="/settings"
              onClick={(e) => {
                e.preventDefault();
                onLinkClick();
                setTimeout(() => {
                  router.push("/settings");
                }, 100);
              }}
              className={cn(
                "flex items-center rounded-md px-3 py-2.5 bg-muted/85 dark:bg-muted/50 hover:bg-muted transition-colors text-[0.95rem]",
                pathname === "/settings"
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground"
              )}
            >
              <Settings className="mr-3 h-4 w-4 text-foreground" />
              <span>Settings</span>
            </Link>
            <Link
              href="/dashboard/profile"
              onClick={(e) => {
                e.preventDefault();
                onLinkClick();
                setTimeout(() => {
                  router.push("/dashboard/profile");
                }, 100);
              }}
              className={cn(
                "flex items-center w-full rounded-md px-3 py-2.5 bg-muted/85 dark:bg-muted/50 hover:bg-muted transition-colors text-[0.95rem]",
                pathname === "/dashboard/profile"
                  ? "bg-muted text-foreground font-medium"
                  : "text-muted-foreground"
              )}
            >
              <UserRound className="mr-3 h-4 w-4 text-foreground" />
              <span>Your Profile</span>
            </Link>

            {/* Theme Toggle - Collapsible */}
            <div>
              <button
                onClick={() => setIsThemeOpen(!isThemeOpen)}
                className={cn(
                  "flex w-full items-center justify-between rounded-md px-3 py-2.5 bg-muted/85 dark:bg-muted/50 hover:bg-muted transition-colors text-[0.95rem]",
                  isThemeOpen
                    ? "bg-muted text-foreground font-medium"
                    : "text-muted-foreground"
                )}
              >
                <div className="flex items-center">
                  {theme === "light" ? (
                    <Sun className="mr-3 h-4 w-4 text-foreground" />
                  ) : theme === "dark" ? (
                    <Moon className="mr-3 h-4 w-4 text-foreground" />
                  ) : (
                    <Monitor className="mr-3 h-4 w-4 text-foreground" />
                  )}
                  <span>Theme</span>
                </div>
                <ChevronRight
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    isThemeOpen && "rotate-90"
                  )}
                />
              </button>
              {isThemeOpen && (
                <div className="ml-4 mt-1 space-y-1">
                  <button
                    onClick={() => {
                      setTheme("light");
                      onLinkClick();
                    }}
                    className={cn(
                      "flex w-full items-center rounded-md px-3 py-2 bg-muted/85 dark:bg-muted/50 hover:bg-muted transition-colors text-[0.95rem]",
                      theme === "light"
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    <Sun className="mr-3 h-4 w-4 text-foreground" />
                    <span>Light</span>
                  </button>
                  <button
                    onClick={() => {
                      setTheme("dark");
                      onLinkClick();
                    }}
                    className={cn(
                      "flex w-full items-center rounded-md px-3 py-2 bg-muted/85 dark:bg-muted/50 hover:bg-muted transition-colors text-[0.95rem]",
                      theme === "dark"
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    <Moon className="mr-3 h-4 w-4 text-foreground" />
                    <span>Dark</span>
                  </button>
                  <button
                    onClick={() => {
                      setTheme("system");
                      onLinkClick();
                    }}
                    className={cn(
                      "flex w-full items-center rounded-md px-3 py-2 bg-muted/85 dark:bg-muted/50 hover:bg-muted transition-colors text-[0.95rem]",
                      theme === "system"
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground"
                    )}
                  >
                    <Monitor className="mr-3 h-4 w-4 text-foreground" />
                    <span>System</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        )}

        {/* Auth Section */}
        {!isSignedIn && (
          <div className="pt-4">
            <SignInButton mode="modal">
              <Button className="w-full" onClick={onLinkClick} variant="default">
                Sign In
              </Button>
            </SignInButton>
          </div>
        )}
      </div>

      {/* Fixed Logout Button */}
      {isSignedIn && (
        <div className="sticky bottom-0 px-4 py-3 border-t bg-background">
          <button
            onClick={handleSignOut}
            className="flex w-full items-center justify-center rounded-md px-3 py-2.5 bg-muted/85 dark:bg-muted/50 hover:bg-muted transition-colors text-[0.95rem] text-destructive"
          >
            <LogOut className="mr-3 h-4 w-4 text-destructive/70" />
            <span>Logout</span>
          </button>
        </div>
      )}

    </div>
  );
}
