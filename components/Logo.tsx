"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";

interface LogoProps {
  fontSize?: string;
  iconSize?: number;
  /** Preload for above-the-fold navbar; set false for secondary instances (e.g. mobile sheet). */
  priority?: boolean;
}

export default function Logo({ priority = true }: LogoProps) {
  return (
    <Link href="/" className="flex items-center shrink-0">
      <div className="relative flex items-center justify-center h-[2.5rem] w-[160px] sm:h-[3rem] sm:w-[200px]">
        <Image
          src="/what2watch-logo.png"
          alt="What2Watch"
          width={200}
          height={48}
          priority={priority}
          className="max-h-full w-auto h-auto object-contain object-left"
          sizes="(max-width: 640px) 160px, 200px"
        />
      </div>
    </Link>
  );
}
