"use client";

import { useState } from "react";
import { useUser, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import Logo from "@/components/Logo";
import Search from "./search";
import { ThemeSwitcherBtn } from "@/components/theme-switcher-btn";
import MobileNav from "./mobile-nav";
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

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Left side - Logo and Desktop Nav */}
        <div className="flex items-center gap-6">
          <Logo fontSize="text-xl" iconSize={20} />
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "px-3 py-2 text-sm font-medium transition-colors rounded-md",
                  "hover:bg-accent hover:text-accent-foreground",
                  pathname === link.href
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Right side - Search, Theme, User */}
        <div className="flex items-center gap-2">
          {/* Search - Hidden on mobile */}
          <div className="hidden sm:block">
            <Search />
          </div>

          {/* Theme Switcher */}
          <ThemeSwitcherBtn />

          {/* Mobile Menu Button */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
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
                <UserButton
                  afterSignOutUrl="/"
                  appearance={{
                    elements: {
                      avatarBox: "h-8 w-8",
                    },
                  }}
                />
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
