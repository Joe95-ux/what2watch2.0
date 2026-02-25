"use client";

import { useEffect } from "react";
import { useUserPreferences } from "@/hooks/use-user-preferences";

export function PrimaryColorProvider() {
  const { data: preferences } = useUserPreferences();

  useEffect(() => {
    if (typeof document === "undefined") return;
    
    const primaryColor = preferences?.primaryColor || "neutral";
    document.documentElement.setAttribute("data-primary-color", primaryColor);
  }, [preferences?.primaryColor]);

  return null;
}
