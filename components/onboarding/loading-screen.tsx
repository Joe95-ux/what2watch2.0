"use client";

import { Loader2 } from "lucide-react";

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-[#066f72] mx-auto mb-4" />
        <p className="text-lg font-medium text-foreground">Customizing your feed...</p>
        <p className="text-sm text-muted-foreground mt-2">This will only take a moment</p>
      </div>
    </div>
  );
}

