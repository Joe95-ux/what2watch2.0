"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export type ResponsiveDialogSurfaceProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Custom header slot — when set, visible title uses this; pass accessibilityTitle for screen readers */
  header?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  accessibilityTitle?: string;
  dialogClassName?: string;
  drawerClassName?: string;
  bodyClassName?: string;
  showCloseButton?: boolean;
};

export function ResponsiveDialogSurface({
  open,
  onOpenChange,
  title,
  description,
  header,
  children,
  footer,
  accessibilityTitle,
  dialogClassName,
  drawerClassName,
  bodyClassName,
  showCloseButton = true,
}: ResponsiveDialogSurfaceProps) {
  const isMobile = useIsMobile();
  const srTitle =
    accessibilityTitle ?? (typeof title === "string" ? title : "Dialog");

  const defaultHeader =
    title || description ? (
      <>
        {title ? <div className="text-lg font-semibold leading-none">{title}</div> : null}
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </>
    ) : null;

  const headerContent = header ?? defaultHeader;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
        <DrawerContent
          className={cn("flex max-h-[90vh] flex-col gap-0 p-0", drawerClassName)}
        >
          {headerContent ? (
            <DrawerHeader className="shrink-0 border-b border-border px-4 py-3 text-left">
              <DrawerTitle className={header ? "sr-only" : ""}>{srTitle}</DrawerTitle>
              {headerContent}
            </DrawerHeader>
          ) : (
            <DrawerTitle className="sr-only">{srTitle}</DrawerTitle>
          )}
          {children ? (
            <div className={cn("min-h-0 flex-1 overflow-y-auto scrollbar-thin", bodyClassName)}>
              {children}
            </div>
          ) : null}
          {footer ? (
            <div className="shrink-0 border-t border-border bg-background">{footer}</div>
          ) : null}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0",
          dialogClassName
        )}
        showCloseButton={showCloseButton}
      >
        {headerContent ? (
          <DialogHeader
            className={cn(
              "shrink-0 px-6 pt-6 pb-4",
              !header && "border-b border-border"
            )}
          >
            {header ? (
              <>
                <DialogTitle className="sr-only">{srTitle}</DialogTitle>
                {headerContent}
              </>
            ) : (
              <>
                <DialogTitle>{title}</DialogTitle>
                {description ? <DialogDescription>{description}</DialogDescription> : null}
              </>
            )}
          </DialogHeader>
        ) : (
          <DialogTitle className="sr-only">{srTitle}</DialogTitle>
        )}
        {children ? (
          <div className={cn("min-h-0 flex-1 overflow-y-auto scrollbar-thin", bodyClassName)}>
            {children}
          </div>
        ) : null}
        {footer ? (
          <DialogFooter className="shrink-0 border-t px-6 py-4 sm:justify-end">
            {footer}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
