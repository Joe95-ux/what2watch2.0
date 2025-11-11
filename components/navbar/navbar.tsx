"use client";

import { useState } from "react";
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
  { href: "/movies", label: "Movies" },
  { href: "/tv", label: "TV Shows" },
  { href: "/my-list", label: "My List" },
  { href: "/playlists", label: "Playlists" },
  { href: "/forums", label: "Forums" },
];

export default function Navbar() {
  const { isSignedIn, isLoaded } = useUser();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check if we're on a page that should use the collapsed nav
  const shouldUseCollapsedNav = pathname === "/my-list" || pathname === "/playlists" || pathname?.startsWith("/playlists/") || pathname === "/search" || pathname?.startsWith("/search");
  
  // Check if we're on a page that should use max-w-7xl (my-list and playlists, but not search)
  const shouldUseMaxWidth = pathname === "/my-list" || pathname === "/playlists" || pathname?.startsWith("/playlists/");

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/60">
      <div className={cn(
        "w-full flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8",
        shouldUseMaxWidth && "max-w-7xl mx-auto"
      )}>
        {/* Left side - Desktop Nav and Logo */}
        <div className="flex items-center gap-8 flex-1">
          {/* Desktop Navigation - Show dropdown on my-list/playlists/search (before logo), regular nav elsewhere (after logo) */}
          {shouldUseCollapsedNav ? (
            <>
              <div className="hidden md:block">
                <NavDropdown navLinks={navLinks} />
              </div>
              <Logo fontSize="text-xl" iconSize={20} />
            </>
          ) : (
            <>
              <Logo fontSize="text-xl" iconSize={20} />
              <div className="hidden md:flex items-center gap-1">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={cn(
                        "relative px-3 py-2 text-sm font-medium transition-colors rounded-md",
                        "hover:bg-accent hover:text-accent-foreground",
                        isActive
                          ? "text-foreground"
                          : "text-muted-foreground",
                        isActive && "after:content-[''] after:absolute after:bottom-[-15px] after:left-0 after:right-0 after:h-[3px] after:bg-[#E50914] after:rounded-t-[15px]"
                      )}
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Right side - Search, User */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Search - Always visible, expands on mobile */}
          <Search />

          {/* Mobile Menu Button */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <HamburgerButton
                isOpen={mobileMenuOpen}
                showMorph={false}
                className="h-9 w-9 text-white"
              />
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px] pt-6">
              <MobileNav 
                navLinks={navLinks} 
                pathname={pathname}
                onLinkClick={() => setMobileMenuOpen(false)}
              />
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
                    className="relative hidden h-9 w-9 md:inline-flex"
                    aria-label="Notifications"
                  >
                    <Bell className="h-5 w-5" />
                    {/* Future notification badge */}
                    {/* <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive"></span> */}
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
                    <UserMenu />
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
      </div>
    </nav>
  );
}
