"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";

interface LogoProps {
  fontSize?: string;
  iconSize?: number;
}

export default function Logo({ fontSize, iconSize }: LogoProps) {
  return (
    <Link href="/" className="flex items-center">
      <Image
        src="/what2watch-logo.png"
        alt="What2Watch"
        width={120}
        height={40}
        className="h-8 w-auto object-contain"
        priority
      />
    </Link>
  );
}