"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function PageViewTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Don't track in development or for admin/API routes
    if (
      process.env.NODE_ENV === "development" ||
      pathname?.startsWith("/api") ||
      pathname?.startsWith("/_next")
    ) {
      return;
    }

    // Get current route pattern (simplified)
    const route = pathname
      ?.replace(/\/[a-f0-9]{24}/g, "[id]") // Replace MongoDB ObjectIds
      .replace(/\/\d+/g, "[id]") // Replace numeric IDs
      .replace(/\/[^/]+$/g, "[slug]") // Replace last segment as slug
      || null;

    // Get page title
    const title = typeof document !== "undefined" ? document.title : null;

    // Track page view
    fetch("/api/analytics/page-views", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        path: pathname,
        route,
        title,
      }),
    }).catch((error) => {
      // Silently fail - don't interrupt user experience
      console.error("Page view tracking error:", error);
    });
  }, [pathname, searchParams]);

  return null; // This component doesn't render anything
}

