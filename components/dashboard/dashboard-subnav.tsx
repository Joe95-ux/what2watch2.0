"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from "@/components/ui/breadcrumb";

/**
 * Dashboard Subnav - Fixed subnav bar right under the navbar
 * Contains: Sidebar Trigger | Truncated Breadcrumbs
 */
export function DashboardSubnav() {
  const pathname = usePathname();

  // Generate breadcrumbs from pathname
  const breadcrumbs = generateBreadcrumbs(pathname);

  return (
    <div className="fixed top-[64px] left-0 right-0 z-40 h-12 border-b border-border/50 bg-background/95 backdrop-blur-sm">
      <div className="flex h-full items-center gap-3 px-4">
        {/* Sidebar Trigger */}
        <SidebarTrigger className="h-8 w-8 flex-shrink-0" />

        {/* Pipe Separator */}
        <div className="h-4 w-px bg-border flex-shrink-0" />

        {/* Breadcrumbs */}
        <Breadcrumb className="flex-1 min-w-0 overflow-hidden">
          <BreadcrumbList className="flex items-center gap-1.5 sm:gap-2.5">
            {breadcrumbs.length > 3 ? (
              // Truncated: Show first, ellipsis, last two
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link href={breadcrumbs[0].href} className="truncate">
                      {breadcrumbs[0].label}
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbEllipsis />
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                {breadcrumbs.slice(-2).map((crumb, index) => {
                  const isLast = index === breadcrumbs.slice(-2).length - 1;
                  return (
                    <React.Fragment key={crumb.href}>
                      <BreadcrumbItem>
                        {isLast ? (
                          <BreadcrumbPage className="truncate max-w-[150px] sm:max-w-[250px]">
                            {crumb.label}
                          </BreadcrumbPage>
                        ) : (
                          <BreadcrumbLink asChild>
                            <Link href={crumb.href} className="truncate max-w-[150px] sm:max-w-[250px]">
                              {crumb.label}
                            </Link>
                          </BreadcrumbLink>
                        )}
                      </BreadcrumbItem>
                      {!isLast && <BreadcrumbSeparator />}
                    </React.Fragment>
                  );
                })}
              </>
            ) : (
              // Show all breadcrumbs if 3 or fewer
              breadcrumbs.map((crumb, index) => {
                const isLast = index === breadcrumbs.length - 1;
                return (
                  <React.Fragment key={crumb.href}>
                    <BreadcrumbItem>
                      {isLast ? (
                        <BreadcrumbPage className="truncate max-w-[150px] sm:max-w-[250px]">
                          {crumb.label}
                        </BreadcrumbPage>
                      ) : (
                        <BreadcrumbLink asChild>
                          <Link href={crumb.href} className="truncate max-w-[150px] sm:max-w-[250px]">
                            {crumb.label}
                          </Link>
                        </BreadcrumbLink>
                      )}
                    </BreadcrumbItem>
                    {!isLast && <BreadcrumbSeparator />}
                  </React.Fragment>
                );
              })
            )}
          </BreadcrumbList>
        </Breadcrumb>
      </div>
    </div>
  );
}

/**
 * Generate breadcrumbs from pathname
 */
function generateBreadcrumbs(pathname: string): Array<{ href: string; label: string }> {
  if (!pathname) return [];

  const segments = pathname.split("/").filter(Boolean);
  const breadcrumbs: Array<{ href: string; label: string }> = [];

  // Always start with Dashboard
  breadcrumbs.push({ href: "/dashboard", label: "Dashboard" });

  // Build breadcrumbs from path segments
  let currentPath = "";
  segments.forEach((segment, index) => {
    // Skip the "dashboard" segment as we already added it
    if (segment === "dashboard" && index === 0) return;

    currentPath += `/${segment}`;
    
    // Format label: capitalize and replace hyphens with spaces
    const label = segment
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    breadcrumbs.push({ href: currentPath, label });
  });

  return breadcrumbs;
}

