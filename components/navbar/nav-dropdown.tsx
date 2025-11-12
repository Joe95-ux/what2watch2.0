"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { HamburgerButton } from "./hamburger-button";

interface NavLink {
  href: string;
  label: string;
}

interface NavDropdownProps {
  navLinks: NavLink[];
  hasHeroSection?: boolean;
}

export function NavDropdown({ navLinks, hasHeroSection = false }: NavDropdownProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <HamburgerButton
          isOpen={open}
          className={cn(
            "h-10 w-10 transition-colors",
            hasHeroSection
              ? "text-white hover:bg-black/20"
              : "text-muted-foreground hover:text-foreground"
          )}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {navLinks.map((link) => {
          // Check if current path matches or starts with link href (for nested routes)
          const isActive =
            pathname === link.href ||
            (link.href !== "/" && pathname?.startsWith(link.href + "/"));
          return (
            <Link key={link.href} href={link.href}>
              <DropdownMenuItem
                className={cn(
                  "cursor-pointer",
                  isActive && "bg-accent text-accent-foreground"
                )}
                onClick={() => setOpen(false)}
              >
                <span>{link.label}</span>
              </DropdownMenuItem>
            </Link>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

