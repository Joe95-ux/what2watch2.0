"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

interface NavLink {
  href: string;
  label: string;
}

interface NavDropdownProps {
  navLinks: NavLink[];
}

export function NavDropdown({ navLinks }: NavDropdownProps) {
  const pathname = usePathname();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Navigation menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {navLinks.map((link) => {
          // Check if current path matches or starts with link href (for nested routes)
          const isActive = pathname === link.href || (link.href !== "/" && pathname?.startsWith(link.href + "/"));
          return (
            <Link key={link.href} href={link.href}>
              <DropdownMenuItem
                className={cn(
                  "cursor-pointer",
                  isActive && "bg-accent text-accent-foreground"
                )}
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

