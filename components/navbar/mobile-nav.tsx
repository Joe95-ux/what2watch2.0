"use client";

import Link from "next/link";
import { useUser, SignInButton, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Settings, LogOut, Moon, Sun, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  navLinks: Array<{ href: string; label: string }>;
  pathname: string;
  onLinkClick: () => void;
}

export default function MobileNav({ navLinks, pathname, onLinkClick }: MobileNavProps) {
  const { isSignedIn } = useUser();
  const { signOut } = useClerk();
  const router = useRouter();
  const { setTheme, theme } = useTheme();

  const handleSignOut = async () => {
    await signOut();
    router.push("/");
    onLinkClick();
  };

  return (
    <div className="flex flex-col gap-4 py-4">
      {/* Navigation Links */}
      <nav className="flex flex-col gap-1 px-4">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onLinkClick}
              className={cn(
                "relative px-3 py-2 text-sm font-medium transition-colors rounded-md",
                "hover:bg-accent hover:text-accent-foreground",
                isActive
                  ? "text-foreground"
                  : "text-muted-foreground",
                isActive && "after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#E50914]"
              )}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* User Menu Items (only shown when signed in) */}
      {isSignedIn && (
        <>
          <Separator />
          <div className="flex flex-col gap-1 px-4">
            <Link
              href="/settings"
              onClick={onLinkClick}
              className={cn(
                "px-3 py-2 text-sm font-medium transition-colors rounded-md",
                "hover:bg-accent hover:text-accent-foreground",
                "flex items-center gap-2",
                pathname === "/settings"
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground"
              )}
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>

            {/* Theme Toggle */}
            <div className="px-3 py-2 text-sm font-medium text-muted-foreground">
              <div className="flex items-center gap-2 mb-2">
                {theme === "light" ? (
                  <Sun className="h-4 w-4" />
                ) : theme === "dark" ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Monitor className="h-4 w-4" />
                )}
                <span>Theme</span>
              </div>
              <div className="flex flex-col gap-1 ml-6">
                <button
                  onClick={() => {
                    setTheme("light");
                    onLinkClick();
                  }}
                  className={cn(
                    "text-left px-2 py-1.5 text-xs rounded-md transition-colors",
                    theme === "light"
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50 text-muted-foreground"
                  )}
                >
                  Light
                </button>
                <button
                  onClick={() => {
                    setTheme("dark");
                    onLinkClick();
                  }}
                  className={cn(
                    "text-left px-2 py-1.5 text-xs rounded-md transition-colors",
                    theme === "dark"
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50 text-muted-foreground"
                  )}
                >
                  Dark
                </button>
                <button
                  onClick={() => {
                    setTheme("system");
                    onLinkClick();
                  }}
                  className={cn(
                    "text-left px-2 py-1.5 text-xs rounded-md transition-colors",
                    theme === "system"
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50 text-muted-foreground"
                  )}
                >
                  System
                </button>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              className={cn(
                "px-3 py-2 text-sm font-medium transition-colors rounded-md",
                "hover:bg-destructive/10 text-destructive",
                "flex items-center gap-2 w-full text-left"
              )}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </>
      )}

      <Separator />

      {/* Auth Section */}
      <div className="px-4">
        {!isSignedIn && (
          <SignInButton mode="modal">
            <Button className="w-full" onClick={onLinkClick}>Sign In</Button>
          </SignInButton>
        )}
      </div>
    </div>
  );
}
