"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ButtonProps = React.ComponentProps<typeof Button>;

type CircleActionButtonProps = Omit<ButtonProps, "size" | "variant"> & {
  size?: "sm" | "md" | "lg";
};

const sizeClasses: Record<NonNullable<CircleActionButtonProps["size"]>, string> = {
  sm: "h-7 w-7",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

export function CircleActionButton({
  size = "sm",
  className,
  children,
  ...props
}: CircleActionButtonProps) {
  return (
    <Button
      variant="ghost"
      className={cn(
        "rounded-full p-0 bg-black/60 text-white border border-white/30 hover:bg-black/70 hover:border-white/40 backdrop-blur-sm transition-all duration-300 hover:scale-105 cursor-pointer",
        sizeClasses[size],
        className,
      )}
      style={{
        transform: "translateZ(0)",
        willChange: "transform",
        backfaceVisibility: "hidden",
      }}
      {...props}
    >
      {children}
    </Button>
  );
}


