import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  id: string;
  label: string;
  description?: string;
  status: 'pending' | 'completed' | 'warning' | 'error';
  optional?: boolean;
}

interface ImportChecklistProps {
  items: ChecklistItem[];
  title?: string;
  description?: string;
}

export const ImportChecklist = ({ items, title = "Import Checklist", description = "Follow these steps to complete your data import" }: ImportChecklistProps) => {
  const completedCount = items.filter(item => item.status === 'completed').length;
  const totalCount = items.length;
  const progressPercentage = (completedCount / totalCount) * 100;

  return (
    <Card className="bg-gradient-surface border-border/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-primary">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-muted-foreground">Progress</p>
            <p className="text-2xl font-bold text-primary">{completedCount}/{totalCount}</p>
          </div>
        </div>
        <div className="w-full bg-muted rounded-full h-2 mt-4">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300" 
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <ol className="space-y-3">
          {items.map((item, index) => (
            <li key={item.id} className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">
                {item.status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                ) : item.status === 'warning' ? (
                  <AlertCircle className="w-5 h-5 text-yellow-600" />
                ) : item.status === 'error' ? (
                  <AlertCircle className="w-5 h-5 text-destructive" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "font-medium text-sm",
                    item.status === 'completed' && "text-green-900 dark:text-green-100",
                    item.status === 'pending' && "text-muted-foreground",
                    item.status === 'warning' && "text-yellow-900 dark:text-yellow-100",
                    item.status === 'error' && "text-destructive"
                  )}>
                    {index + 1}. {item.label}
                  </span>
                  {item.optional && (
                    <span className="text-xs text-muted-foreground px-2 py-0.5 bg-muted rounded">
                      Optional
                    </span>
                  )}
                </div>
                {item.description && (
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
};
