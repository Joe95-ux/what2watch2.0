"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface HamburgerButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isOpen: boolean;
}

const HamburgerButton = React.forwardRef<HTMLButtonElement, HamburgerButtonProps>(
  ({ isOpen, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={isOpen ? "Close menu" : "Open menu"}
        aria-pressed={isOpen}
        className={cn(
          "relative flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black",
          className
        )}
        {...props}
      >
        <span className="relative block h-5 w-7">
          <span
            className={cn(
              "absolute left-0 top-0 h-[2px] w-full rounded-full bg-current transition-all duration-300 ease-in-out",
              isOpen && "translate-y-[9px] rotate-45"
            )}
          />
          <span
            className={cn(
              "absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 rounded-full bg-current transition-all duration-200 ease-in-out",
              isOpen && "opacity-0"
            )}
          />
          <span
            className={cn(
              "absolute bottom-0 left-0 h-[2px] w-[70%] rounded-full bg-current transition-all duration-300 ease-in-out",
              isOpen && "bottom-[9px] w-full -rotate-45"
            )}
          />
        </span>
      </button>
    );
  }
);

HamburgerButton.displayName = "HamburgerButton";

export { HamburgerButton };

