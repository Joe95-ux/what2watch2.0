"use client";

import { useState, useEffect } from "react";
import { useUser, SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UnifiedNotificationCenter } from "@/components/notifications/unified-notification-center";
import { FeedbackDropdown } from "./feedback-dropdown";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Logo from "@/components/Logo";
import Search from "./search";
import { UserProfileButton } from "./user-profile-button";
import MobileNav from "./mobile-nav";
import { HamburgerButton } from "./hamburger-button";
import { useYouTubeToolsVisibility } from "@/hooks/use-youtube-tools-visibility";
import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
}

const navLinks: NavLink[] = [
  { href: "/browse", label: "Browse" },
  { href: "/popular", label: "Popular" },
  { href: "/lists", label: "Lists" },
  { href: "/members", label: "Members" },
  { href: "/forum", label: "Forums" },
];

// Only Lists and Popular in the navbar (left links); rest in sidebar
const leftNavLinks: NavLink[] = [
  { href: "/lists", label: "Lists" },
  { href: "/popular", label: "Popular" },
];

export default function Navbar() {
  const { isSignedIn, isLoaded } = useUser();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSheetMounted, setIsSheetMounted] = useState(false);

  // Delay content rendering until Sheet animation completes to prevent flicker
  useEffect(() => {
    if (mobileMenuOpen) {
      setIsSheetMounted(false);
      const timer = setTimeout(() => {
        setIsSheetMounted(true);
      }, 300); // 300ms delay - allows Sheet animation to start smoothly before content renders
      return () => clearTimeout(timer);
    } else {
      setIsSheetMounted(false);
    }
  }, [mobileMenuOpen]);

  // Check if we're on dashboard page
  // Exclude /dashboard/ai/discover from dashboard layout (search should be on right)
  const isDiscoverPage =
    pathname === "/dashboard/ai/discover" ||
    pathname?.startsWith("/dashboard/ai/discover");
  const isDashboard =
    (pathname === "/dashboard" || pathname?.startsWith("/dashboard/")) &&
    !isDiscoverPage;

  const shouldUseMaxSearchNav =
    pathname === "/search" || pathname?.startsWith("/search") || pathname === "/popular" || pathname?.startsWith("/popular") || pathname === "/members" || pathname?.startsWith("/members");

  const isDetailsNav = pathname?.startsWith("/tv/") || pathname?.startsWith("/movie/");

  const isGuideNav =
    pathname === "/browse/personalized" ||
    pathname === "/youtube" ||
    pathname?.startsWith("/lists") ||
    pathname?.startsWith("/playlists") ||
    pathname?.startsWith("/youtube-channel/lists/") ||
    pathname === "/editorial" ||
    pathname?.startsWith("/editorial/") ||
    (pathname?.startsWith("/content/") && pathname?.endsWith("/reviews"));

  const isDashboardNav = pathname === "/dashboard" || pathname?.startsWith("/dashboard");

  const isSettingsNav = pathname === "/settings" || pathname?.startsWith("/settings");

  const useDarkNavbar = true;

  return (
    <nav
      className={cn(
        "sticky top-0 z-50 w-full backdrop-blur-md transition-all duration-300 ease-in-out",
        useDarkNavbar
          ? "bg-[rgb(1,10,15)] border-b border-[rgba(255,255,255,0.12)] shadow-sm"
          : "bg-background/95 dark:bg-background/80 border-b border-border/50 supports-[backdrop-filter]:bg-background/80 dark:supports-[backdrop-filter]:bg-background/80"
      )}
    >
      <div
        className={cn(
          "w-full flex h-16 items-center",
          isSettingsNav ? "px-4" : "px-4 sm:px-6 lg:px-8",
          shouldUseMaxSearchNav && "container mx-auto",
          "grid grid-cols-[auto_1fr_auto] gap-2 md:gap-4",
          isDiscoverPage && "!grid",
          isDetailsNav && "max-w-7xl mx-auto",
          isSettingsNav && "max-w-7xl mx-auto",
          isGuideNav && "max-w-[92rem] mx-auto",
          isDashboardNav && !isSettingsNav && "sm:px-4 lg:px-4",
        )}
      >
        {/* Left: Hamburger + Logo + (Lists, Popular when not dashboard/discover) */}
        <div className="flex items-center gap-3 min-w-0">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <HamburgerButton
                isOpen={mobileMenuOpen}
                showMorph={false}
                className={cn(
                  "h-9 w-9 max-[412px]:h-7 max-[412px]:w-7 transition-colors duration-300 flex-shrink-0",
                    useDarkNavbar && "text-white hover:bg-black/20"
                )}
              />
            </SheetTrigger>
            <SheetContent side="left" className="w-[340px] max-w-[340px] p-0 [&>button]:hidden">
              <MobileNav
                navLinks={navLinks}
                pathname={pathname}
                onLinkClick={() => setMobileMenuOpen(false)}
              />
            </SheetContent>
          </Sheet>
          <Logo fontSize="text-xl" iconSize={20} />
          {/* Left nav links: only Lists and Popular, when not dashboard/discover */}
          {!isDashboard && !isDiscoverPage && (
            <div className="hidden xl:flex items-center gap-1 flex-shrink-0 ml-1">
              {leftNavLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "relative px-3 py-2 text-sm font-medium transition-colors rounded-md whitespace-nowrap",
                      useDarkNavbar
                        ? "hover:bg-white/10 hover:text-white"
                        : "hover:bg-accent hover:text-accent-foreground",
                      isActive
                        ? useDarkNavbar
                          ? "text-white font-semibold"
                          : "text-foreground dark:text-foreground font-semibold"
                        : useDarkNavbar
                        ? "text-white/90"
                        : "text-foreground/80 dark:text-muted-foreground",
                      isActive &&
                        "after:content-[''] after:absolute after:bottom-[-15px] after:left-0 after:right-0 after:h-[3px] after:bg-[#E50914] after:rounded-t-[15px]"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Center: Search bar (wider, centered). On mobile shown on right via same Search behavior. */}
        <div className="hidden md:flex items-center justify-center min-w-0 px-2">
          <Search hasHeroSection={useDarkNavbar} centered />
        </div>

        {/* Right: Search on mobile only (icon, aligned right); auth items */}
        <div className="flex items-center gap-0 sm:gap-3 flex-shrink-0 justify-end md:justify-start">
          <div className="md:hidden">
            <Search hasHeroSection={useDarkNavbar} />
          </div>
          {isLoaded && (
            <div className="flex items-center gap-0 sm:gap-2">
              {isSignedIn ? (
                <>
                  <div
                    className={cn(
                      "hidden md:inline-flex cursor-pointer",
                      useDarkNavbar &&
                        "[&_button]:!text-white [&_button]:hover:!bg-black/20 [&_button]:hover:!text-white [&_button_svg]:!text-white [&_button]:hover:[&_svg]:!text-white"
                    )}
                  >
                    <UnifiedNotificationCenter />
                  </div>
                  <div
                    className={cn(
                      "hidden md:inline-flex cursor-pointer",
                      useDarkNavbar &&
                        "[&_button]:!text-white [&_button]:hover:!bg-black/20 [&_button]:hover:!text-white [&_button_svg]:!text-white [&_button]:hover:[&_svg]:!text-white"
                    )}
                  >
                    <FeedbackDropdown hasHeroSection={useDarkNavbar} />
                  </div>
                  <UserProfileButton hasHeroSection={useDarkNavbar} />
                </>
              ) : (
                <SignInButton 
                  mode="modal"
                  fallbackRedirectUrl={typeof window !== "undefined" ? window.location.href : "/browse"}
                >
                  <Button size="sm" className="cursor-pointer">
                    Sign In
                  </Button>
                </SignInButton>
              )}
            </div>
          )}
        </div>
      </div>

    </nav>
  );
}
