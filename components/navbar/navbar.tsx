"use client";

import { useState, useEffect } from "react";
import { useUser, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Logo from "@/components/Logo";
import Search from "./search";
import { UserMenu } from "./user-menu";
import { NavDropdown } from "./nav-dropdown";
import MobileNav from "./mobile-nav";
import { HamburgerButton } from "./hamburger-button";
import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
}

const navLinks: NavLink[] = [
  { href: "/browse", label: "Browse" },
  { href: "/popular", label: "Popular" },
  { href: "/lists", label: "Lists" },
  { href: "/dashboard/my-list", label: "My List" },
  { href: "/forums", label: "Forums" },
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
  const isDiscoverPage = pathname === "/dashboard/ai/discover" || pathname?.startsWith("/dashboard/ai/discover");
  const isDashboard = (pathname === "/dashboard" || pathname?.startsWith("/dashboard/")) && !isDiscoverPage;

  // Check if we're on a page that should use max-w-7xl (my-list, but not search)
  const shouldUseMaxWidth = pathname === "/dashboard/my-list";

  const shouldUseMaxSearchNav = pathname === "/search" || pathname?.startsWith("/search");

  // Check if we're on a page with hero section (dark navbar needed)
  const hasHeroSection = pathname === "/browse" || pathname === "/popular" || pathname === "/lists" || pathname?.startsWith("/browse/") || pathname?.startsWith("/popular") || pathname?.startsWith("/lists/");

  return (
    <nav className={cn(
      "sticky top-0 z-50 w-full backdrop-blur-md transition-all duration-300 ease-in-out",
      hasHeroSection 
        ? "bg-black/60 border-b border-[rgba(255,255,255,0.1)] shadow-sm"
        : "bg-background/80 dark:bg-background/80 border-b border-border/50 supports-[backdrop-filter]:bg-background/60 dark:supports-[backdrop-filter]:bg-background/60"
    )}>
      <div className={cn(
        "w-full flex h-16 items-center px-4 sm:px-6 lg:px-8",
        shouldUseMaxWidth && "max-w-7xl mx-auto",
        shouldUseMaxSearchNav && "container mx-auto",
        isDashboard ? "grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1fr_auto] gap-2 md:gap-4" : "justify-between",
        isDiscoverPage && "justify-between"
      )}>
        {/* Left side - Hamburger (below 1280px) and Logo */}
        <div className="flex items-center gap-3">
          {/* Navigation Dropdown - Show between md (768px) and xl (1280px), hidden on dashboard */}
          {!isDashboard && !isDiscoverPage && (
            <div className="hidden md:block xl:hidden">
              <NavDropdown navLinks={navLinks} hasHeroSection={hasHeroSection} />
            </div>
          )}
          <Logo fontSize="text-xl" iconSize={20} />
        </div>

        {/* Center - Search (only on dashboard, not discover page) */}
        {isDashboard ? (
          <div className="flex items-center justify-center min-w-0">
            <Search hasHeroSection={hasHeroSection} />
          </div>
        ) : (
          <>
            {/* Center - Desktop Nav (non-dashboard and discover page, xl (1280px) and above) */}
            {!isDashboard && !isDiscoverPage && (
              <div className="hidden xl:flex items-center gap-1 flex-1 ml-3">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "relative px-3 py-2 text-sm font-medium transition-colors rounded-md",
                        hasHeroSection 
                          ? "hover:bg-white/10 hover:text-white"
                          : "hover:bg-accent hover:text-accent-foreground",
                        isActive
                          ? hasHeroSection ? "text-white font-semibold" : "text-foreground dark:text-foreground font-semibold"
                          : hasHeroSection ? "text-white/90" : "text-foreground/80 dark:text-muted-foreground",
                        isActive && "after:content-[''] after:absolute after:bottom-[-15px] after:left-0 after:right-0 after:h-[3px] after:bg-[#E50914] after:rounded-t-[15px]"
                      )}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Right side - Search, User (non-dashboard and discover page) */}
            <div className="flex items-center gap-3 flex-shrink-0">
              {/* Search - Always visible, expands on mobile */}
              <Search hasHeroSection={hasHeroSection} />

              {/* Mobile Menu Button */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild className="md:hidden">
                  <HamburgerButton
                    isOpen={mobileMenuOpen}
                    showMorph={false}
                    className={cn(
                      "h-9 w-9 max-[412px]:h-7 max-[412px]:w-7 transition-colors duration-300",
                      hasHeroSection && "text-white hover:bg-black/20"
                    )}
                  />
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] sm:w-[400px] pt-6">
                  {isSheetMounted && (
                    <MobileNav 
                      navLinks={navLinks} 
                      pathname={pathname}
                      onLinkClick={() => setMobileMenuOpen(false)}
                    />
                  )}
                </SheetContent>
              </Sheet>

              {/* User Auth */}
              {isLoaded && (
                <div className="flex items-center gap-2">
                  {isSignedIn ? (
                    <>
                      {/* Notification Icon */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "relative hidden h-9 w-9 md:inline-flex transition-colors duration-300",
                          hasHeroSection && "hover:bg-black/20 text-white"
                        )}
                        aria-label="Notifications"
                      >
                        <Bell className={cn(
                          "h-5 w-5 transition-colors duration-300",
                          hasHeroSection && "text-white"
                        )} />
                      </Button>
                      <UserButton
                        afterSignOutUrl="/"
                        appearance={{
                          elements: {
                            avatarBox: "h-8 w-8",
                          },
                        }}
                      />
                      {/* User Menu - Hidden on mobile, shown in mobile menu */}
                      <div className="hidden md:block">
                        <UserMenu hasHeroSection={hasHeroSection} />
                      </div>
                    </>
                  ) : (
                    <SignInButton mode="modal">
                      <Button size="sm" className="hidden sm:inline-flex">
                        Sign In
                      </Button>
                    </SignInButton>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Right side - User (dashboard only) */}
        {isDashboard && (
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Mobile Menu Button */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild className="md:hidden">
                <HamburgerButton
                  isOpen={mobileMenuOpen}
                  showMorph={false}
                  className={cn(
                    "h-9 w-9 max-[412px]:h-7 max-[412px]:w-7 transition-colors duration-300",
                    hasHeroSection && "text-white hover:bg-black/20"
                  )}
                />
              </SheetTrigger>
              <SheetContent side="right" className="w-[300px] sm:w-[400px] pt-6">
                {isSheetMounted && (
                  <MobileNav 
                    navLinks={navLinks} 
                    pathname={pathname}
                    onLinkClick={() => setMobileMenuOpen(false)}
                  />
                )}
              </SheetContent>
            </Sheet>

            {/* User Auth */}
            {isLoaded && (
              <div className="flex items-center gap-2">
                {isSignedIn ? (
                  <>
                    {/* Notification Icon */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "relative hidden h-9 w-9 md:inline-flex transition-colors duration-300",
                        hasHeroSection && "hover:bg-black/20 text-white"
                      )}
                      aria-label="Notifications"
                    >
                      <Bell className={cn(
                        "h-5 w-5 transition-colors duration-300",
                        hasHeroSection && "text-white"
                      )} />
                    </Button>
                    <UserButton
                      afterSignOutUrl="/"
                      appearance={{
                        elements: {
                          avatarBox: "h-8 w-8",
                        },
                      }}
                    />
                    {/* User Menu - Hidden on mobile, shown in mobile menu */}
                    <div className="hidden md:block">
                      <UserMenu hasHeroSection={hasHeroSection} />
                    </div>
                  </>
                ) : (
                  <SignInButton mode="modal">
                    <Button size="sm" className="hidden sm:inline-flex">
                      Sign In
                    </Button>
                  </SignInButton>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
