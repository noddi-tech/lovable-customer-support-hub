import * as React from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slot } from "@radix-ui/react-slot";

export interface PaneColumnProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  asChild?: boolean;
}

export interface PaneHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export interface PaneScrollProps extends React.ComponentPropsWithoutRef<typeof ScrollArea> {
  children: React.ReactNode;
}

/**
 * Wrapper for a pane in a multi-pane layout.
 * Ensures proper height constraints for nested scrolling.
 */
export function PaneColumn({ className, children, asChild = false, ...props }: PaneColumnProps) {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      className={cn("min-h-0 min-w-0 flex flex-col", className)}
      {...props}
    >
      {children}
    </Comp>
  );
}

/**
 * Header section for a pane that doesn't participate in scrolling.
 * Use for toolbars, titles, and other fixed content.
 */
export function PaneHeader({ className, children, ...props }: PaneHeaderProps) {
  return (
    <div
      className={cn("shrink-0", className)}
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * Scrollable content area for a pane.
 * Uses shadcn ScrollArea with proper height constraints.
 */
export function PaneScroll({ className, children, ...props }: PaneScrollProps) {
  return (
    <ScrollArea
      className={cn("h-full w-full", className)}
      {...props}
    >
      {children}
    </ScrollArea>
  );
}