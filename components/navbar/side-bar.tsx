"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  Film, 
  Tv, 
  Heart, 
  List, 
  MessageSquare,
  Settings,
  User,
  LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

const sidebarLinks: NavLink[] = [
  { href: "/browse", label: "Browse", icon: Home },
  { href: "/movies", label: "Movies", icon: Film },
  { href: "/tv", label: "TV Shows", icon: Tv },
  { href: "/dashboard/my-list", label: "My List", icon: Heart },
  { href: "/dashboard/playlists", label: "Playlists", icon: List },
  { href: "/forums", label: "Forums", icon: MessageSquare },
];

const userLinks: NavLink[] = [
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 border-r bg-background p-4">
      <nav className="flex flex-col gap-1">
        {sidebarLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={link.href}>
              <Button
                variant={pathname === link.href ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3",
                  pathname === link.href && "bg-accent"
                )}
              >
                <Icon className="h-5 w-5" />
                {link.label}
              </Button>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-4 border-t">
        <nav className="flex flex-col gap-1">
          {userLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link key={link.href} href={link.href}>
                <Button
                  variant={pathname === link.href ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3",
                    pathname === link.href && "bg-accent"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {link.label}
                </Button>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
