import { useState } from "react";
import { ChevronDown, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

interface IntegrationSectionProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  defaultOpen?: boolean;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function IntegrationSection({
  icon: Icon,
  title,
  description,
  defaultOpen = false,
  action,
  children,
  className
}: IntegrationSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className={cn("group", className)}>
      <div className={cn(
        "rounded-lg border border-border/50 bg-card/30 transition-all duration-200",
        isOpen && "bg-card/60 shadow-sm"
      )}>
        {/* Header */}
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors rounded-t-lg">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg transition-colors",
                isOpen ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{title}</h3>
                {description && (
                  <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {action && (
                <div onClick={(e) => e.stopPropagation()}>
                  {action}
                </div>
              )}
              <ChevronDown className={cn(
                "h-5 w-5 text-muted-foreground transition-transform duration-200",
                isOpen && "rotate-180"
              )} />
            </div>
          </button>
        </CollapsibleTrigger>

        {/* Content */}
        <CollapsibleContent className="data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
          <div className="px-4 pb-4 pt-2">
            {children}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
