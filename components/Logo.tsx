"use client";
import React from "react";
import Link from "next/link";

interface LogoProps {
  fontSize?: string;
  iconSize?: number;
}

export default function Logo({ fontSize, iconSize }: LogoProps) {
  return (
    <Link href="/" className="flex items-center">
      <div className="flex items-center h-[2.5rem] w-[160px] sm:h-[3rem] sm:w-[200px]">
        <img
          src="/what2watch-logo.png"
          alt="What2Watch"
          className="max-h-full max-w-full h-auto w-auto"
        />
      </div>
    </Link>
  );
}