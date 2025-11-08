"use client";

import Link from "next/link";
import { useUser, SignInButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Search from "./search";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  navLinks: Array<{ href: string; label: string }>;
  pathname: string;
  onLinkClick: () => void;
}

export default function MobileNav({ navLinks, pathname, onLinkClick }: MobileNavProps) {
  const { isSignedIn } = useUser();

  return (
    <div className="flex flex-col gap-4 py-4">
      {/* Mobile Search */}
      <div className="px-4">
        <Search />
      </div>

      <Separator />

      {/* Navigation Links */}
      <nav className="flex flex-col gap-1 px-4">
        {navLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={onLinkClick}
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
      </nav>

      <Separator />

      {/* Auth Section */}
      <div className="px-4">
        {!isSignedIn && (
          <SignInButton mode="modal">
            <Button className="w-full">Sign In</Button>
          </SignInButton>
        )}
      </div>
    </div>
  );
}
