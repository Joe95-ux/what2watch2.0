"use client";

import { useMemo } from "react";
import { useUserPreferences } from "@/hooks/use-user-preferences";
import { dashboardLandingHref, normalizeDashboardLayout } from "@/lib/dashboard-layout";

/** Where the Dashboard entry points should open. */
export function useDashboardEntryHref() {
  const { data: preferences } = useUserPreferences();
  return useMemo(
    () => dashboardLandingHref(normalizeDashboardLayout(preferences?.dashboardLayout).landing),
    [preferences?.dashboardLayout]
  );
}
