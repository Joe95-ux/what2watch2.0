"use client";

import * as React from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type TriggerElementProps = {
  onClick?: React.MouseEventHandler;
  onPointerDown?: React.PointerEventHandler;
  "data-slot"?: string;
};

function createMobileDrawerTrigger(
  trigger: React.ReactNode,
  onOpenChange: (open: boolean) => void,
): React.ReactNode {
  if (!React.isValidElement(trigger)) {
    return (
      <button type="button" data-slot="drawer-trigger" onClick={() => onOpenChange(true)}>
        {trigger}
      </button>
    );
  }

  const triggerElement = trigger as React.ReactElement<TriggerElementProps>;

  return React.cloneElement(triggerElement, {
    "data-slot": "drawer-trigger",
    onPointerDown: (e: React.PointerEvent) => {
      triggerElement.props.onPointerDown?.(e);
      e.stopPropagation();
    },
    onClick: (e: React.MouseEvent) => {
      triggerElement.props.onClick?.(e);
      onOpenChange(true);
    },
  });
}

export type ResponsiveMenuSurfaceProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger: React.ReactNode;
  /** Visible header slot (tabs, title row, etc.) */
  header?: React.ReactNode;
  /** Scrollable body */
  children: React.ReactNode;
  /** Fixed footer slot (create actions, submit row, etc.) */
  footer?: React.ReactNode;
  /** Screen-reader title for drawer accessibility */
  accessibilityTitle?: string;
  dropdownClassName?: string;
  dropdownAlign?: "start" | "center" | "end";
  dropdownAlignOffset?: number;
  dropdownSideOffset?: number;
  drawerClassName?: string;
  bodyClassName?: string;
  stopPropagation?: boolean;
};

export function ResponsiveMenuSurface({
  open,
  onOpenChange,
  trigger,
  header,
  children,
  footer,
  accessibilityTitle = "Menu",
  dropdownClassName,
  dropdownAlign = "end",
  dropdownAlignOffset = 0,
  dropdownSideOffset = 4,
  drawerClassName,
  bodyClassName,
  stopPropagation = true,
}: ResponsiveMenuSurfaceProps) {
  const isMobile = useIsMobile();

  const handleContentClick = (e: React.MouseEvent) => {
    if (stopPropagation) e.stopPropagation();
  };

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
        {createMobileDrawerTrigger(trigger, onOpenChange)}
        <DrawerContent
          className={cn("flex max-h-[85vh] flex-col gap-0 p-0", drawerClassName)}
          onClick={handleContentClick}
        >
          {header ? (
            <DrawerHeader className="shrink-0 border-b border-border px-4 py-3 text-left">
              <DrawerTitle className="sr-only">{accessibilityTitle}</DrawerTitle>
              {header}
            </DrawerHeader>
          ) : (
            <DrawerTitle className="sr-only">{accessibilityTitle}</DrawerTitle>
          )}
          <div className={cn("min-h-0 flex-1 overflow-y-auto scrollbar-thin", bodyClassName)}>
            {children}
          </div>
          {footer ? (
            <div className="shrink-0 border-t border-border bg-background">{footer}</div>
          ) : null}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent
        align={dropdownAlign}
        alignOffset={dropdownAlignOffset}
        sideOffset={dropdownSideOffset}
        className={cn(
          "z-[110] flex max-h-[400px] flex-col overflow-hidden p-0",
          dropdownClassName
        )}
        onClick={handleContentClick}
      >
        {header ? (
          <div className="shrink-0 border-b border-border px-3 py-2">{header}</div>
        ) : null}
        <div className={cn("min-h-0 flex-1 overflow-y-auto scrollbar-thin", bodyClassName)}>
          {children}
        </div>
        {footer ? (
          <div className="shrink-0 border-t border-border bg-popover">{footer}</div>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Disabled / empty row — works outside DropdownMenu on mobile. */
export function ResponsiveMenuPlaceholder({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("px-3 py-2 text-sm text-muted-foreground", className)}>{children}</div>
  );
}
