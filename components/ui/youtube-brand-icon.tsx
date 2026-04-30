"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

export function YouTubeBrandIcon({ className }: { className?: string }) {
  return (
    <Image
      src="/yt_icon_red_digital.png"
      alt="YouTube"
      width={20}
      height={20}
      className={cn("h-4 w-4 object-contain", className)}
      unoptimized
    />
  );
}
