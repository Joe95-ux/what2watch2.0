"use client";

import Link from "next/link";
import { useUser, SignInButton, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Settings, LogOut, Moon, Sun, Monitor, ChevronRight } from "lucide-react";
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
    <div className="flex flex-col">
      {/* Navigation Links - Styled like DropdownMenu */}
      <div className="p-1">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
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
      </div>

      {/* User Menu Items (only shown when signed in) */}
      {isSignedIn && (
        <>
          <Separator className="my-1" />
          <div className="p-1">
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

            {/* Theme Toggle - Styled like DropdownMenuSubTrigger */}
            <div className="relative">
              <div className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[state=open]:bg-accent data-[state=open]:text-accent-foreground hover:bg-accent hover:text-accent-foreground text-muted-foreground">
                {theme === "light" ? (
                  <Sun className="mr-2 h-4 w-4" />
                ) : theme === "dark" ? (
                  <Moon className="mr-2 h-4 w-4" />
                ) : (
                  <Monitor className="mr-2 h-4 w-4" />
                )}
                <span>Theme</span>
                <ChevronRight className="ml-auto h-4 w-4" />
              </div>
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
            </div>

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
