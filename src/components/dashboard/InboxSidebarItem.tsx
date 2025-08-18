import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface InboxSidebarItemProps {
  id: string;
  label: string;
  icon: LucideIcon;
  count?: number;
  isActive: boolean;
  onClick: () => void;
}

export function InboxSidebarItem({ 
  id, 
  label, 
  icon: Icon, 
  count, 
  isActive, 
  onClick 
}: InboxSidebarItemProps) {
  return (
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-between px-3 py-2 h-auto text-left font-normal",
        isActive 
          ? "bg-primary/10 text-primary hover:bg-primary/20" 
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4" />
        <span className="text-sm">{label}</span>
      </div>
      {count !== undefined && count > 0 && (
        <Badge 
          variant={isActive ? "default" : "secondary"} 
          className="text-xs min-w-5 h-5 px-1.5"
        >
          {count}
        </Badge>
      )}
    </Button>
  );
}