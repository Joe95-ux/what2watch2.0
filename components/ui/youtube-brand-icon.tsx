"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

export function YouTubeBrandIcon({ className }: { className?: string }) {
  return (
    <Image
      src="/yt_icon_red_digital.png"
      alt="YouTube"
      width={24}
      height={24}
      className={cn("h-6 w-6 object-contain", className)}
      unoptimized
    />
  );
}
