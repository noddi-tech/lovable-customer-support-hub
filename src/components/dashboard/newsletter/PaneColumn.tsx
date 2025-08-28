import * as React from "react";
import { cn } from "@/lib/utils";

export function PaneColumn({
  header,
  children,
  className,
  "data-testid": dataTestId,
}: React.PropsWithChildren<{ header: React.ReactNode; className?: string; "data-testid"?: string }>) {
  return (
    <div data-testid={dataTestId} className={cn("grid min-h-0 grid-rows-[auto_1fr]", className)}>
      {/* Fixed header row */}
      <div className="sticky top-0 z-10 bg-background">{header}</div>
      {/* Scrollable body row */}
      <div className="min-h-0 overflow-y-auto [scrollbar-gutter:stable_both-edges]">
        {children}
      </div>
    </div>
  );
}