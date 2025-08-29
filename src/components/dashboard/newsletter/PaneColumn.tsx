import * as React from "react";
import { cn } from "@/lib/utils";

export function PaneColumn({
  header,
  children,
  className,
  "data-testid": dataTestId,
}: React.PropsWithChildren<{ header: React.ReactNode; className?: string; "data-testid"?: string }>) {
  return (
    <div data-testid={dataTestId} className={cn("flex flex-col min-h-0 h-full", className)}>
      {/* Fixed header row */}
      <div className="shrink-0 bg-background">{header}</div>
      {/* Scrollable body row - let parent ScrollArea handle the scroll */}
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
}