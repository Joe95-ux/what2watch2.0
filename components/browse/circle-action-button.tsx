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
        "rounded-full p-0 bg-white/10 text-white border border-slate-300 dark:border-white/30 hover:bg-white/20 hover:border-slate-400 dark:hover:border-white/50 backdrop-blur-sm transition-all duration-300 hover:scale-105 cursor-pointer",
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


