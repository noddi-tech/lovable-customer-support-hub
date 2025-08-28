import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsList } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface PaneTabsProps {
  tabs: React.ReactNode;
  children: React.ReactNode;
  sticky?: boolean;
  className?: string;
}

/**
 * PaneTabs: Safe wrapper for Tabs to prevent overlap issues
 * 
 * Implements Pattern A: Tabs + content inside the same Card with proper spacing
 * - TabsList gets mb-2 spacing, never negative margins
 * - Content area is properly scrollable with min-h-0
 * - Sticky headers get proper z-index and background
 */
export function PaneTabs({ 
  tabs, 
  children, 
  sticky = false, 
  className 
}: PaneTabsProps) {
  if (sticky) {
    return (
      <div className={cn("h-full flex flex-col", className)}>
        <div className="sticky top-0 z-10 bg-background px-3 pt-3">
          {tabs}
          <div className="mb-2" />
        </div>
        <Separator />
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3">
            {children}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <Card className={cn("h-full flex flex-col", className)}>
      <div className="px-3 pt-3">
        {tabs}
        <div className="mb-2" />
      </div>
      <Separator />
      <CardContent className="flex-1 min-h-0 p-0">
        <ScrollArea className="h-full">
          <div className="p-3">
            {children}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

/**
 * SafeTabsList: TabsList with standardized spacing that prevents overlap
 * 
 * Always includes mb-2/mb-3 and removes any negative margins
 * Use this instead of raw TabsList when content follows below
 */
export const SafeTabsList = React.forwardRef<
  React.ElementRef<typeof TabsList>,
  React.ComponentPropsWithoutRef<typeof TabsList> & {
    spacing?: "tight" | "normal" | "loose";
  }
>(({ className, spacing = "normal", ...props }, ref) => {
  const spacingClasses = {
    tight: "mb-2",
    normal: "mb-3", 
    loose: "mb-4"
  };

  return (
    <TabsList
      ref={ref}
      className={cn(
        // Standard styling with safe spacing
        "h-8 gap-1 rounded-lg bg-muted p-1",
        spacingClasses[spacing],
        // Remove any negative margins that might be passed
        className?.replace(/-mb-\w+|mt-\[-?\w+px?\]/g, "")
      )}
      {...props}
    />
  );
});

SafeTabsList.displayName = "SafeTabsList";