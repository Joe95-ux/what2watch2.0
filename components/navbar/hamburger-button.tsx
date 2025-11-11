"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface HamburgerButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isOpen: boolean;
  showMorph?: boolean;
}

const HamburgerButton = React.forwardRef<HTMLButtonElement, HamburgerButtonProps>(
  ({ isOpen, showMorph = true, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-pressed={isOpen}
        className={cn(
          "relative cursor-pointer flex items-center justify-center text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className
        )}
        {...props}
      >
        <span className="relative block h-5 w-7">
          <span
            className={cn(
              "absolute left-0 top-0 h-[2px] w-full rounded-full bg-current transition-all duration-300 ease-in-out",
              showMorph && isOpen && "translate-y-[9px] rotate-45"
            )}
          />
          <span
            className={cn(
              "absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 rounded-full bg-current transition-all duration-200 ease-in-out",
              showMorph && isOpen && "opacity-0"
            )}
          />
          <span
            className={cn(
              "absolute bottom-0 left-0 h-[2px] w-[70%] rounded-full bg-current transition-all duration-300 ease-in-out",
              showMorph && isOpen && "bottom-[9px] w-full -rotate-45"
            )}
          />
        </span>
      </button>
    );
  }
);

HamburgerButton.displayName = "HamburgerButton";

export { HamburgerButton };

