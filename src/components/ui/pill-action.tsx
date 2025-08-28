import * as React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PillActionProps extends React.ComponentProps<typeof Button> {}

export function PillAction({ className, children, ...props }: PillActionProps) {
  return (
    <Button
      variant="secondary"
      size="sm"
      className={cn(
        "inline-flex !flex-row !items-center gap-2 !whitespace-nowrap leading-none shrink-0 min-w-fit",
        "h-8 px-3 rounded-lg", // visual fit for pill
        className?.replace(/\bflex-col\b/g, "flex-row").replace(/\bgrid\b/g, "inline-flex")
      )}
      {...props}
    >
      {children}
    </Button>
  );
}