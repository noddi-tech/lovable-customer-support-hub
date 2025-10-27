import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Clock, AlertTriangle, CheckCircle, Timer } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SLAStatusIndicatorProps {
  dueDate?: string;
  completedAt?: string;
  status: string;
  showLabel?: boolean;
}

export const SLAStatusIndicator = ({ 
  dueDate, 
  completedAt,
  status,
  showLabel = true 
}: SLAStatusIndicatorProps) => {
  if (!dueDate) return null;

  const now = new Date();
  const due = new Date(dueDate);
  const isCompleted = ['completed', 'closed'].includes(status);
  const completed = completedAt ? new Date(completedAt) : null;

  // If completed, check if it was on time
  if (isCompleted && completed) {
    const wasOnTime = completed <= due;
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge 
              variant={wasOnTime ? 'default' : 'destructive'}
              className="gap-1 cursor-help"
            >
              {wasOnTime ? (
                <CheckCircle className="h-3 w-3" />
              ) : (
                <AlertTriangle className="h-3 w-3" />
              )}
              {showLabel && (wasOnTime ? 'SLA Met' : 'SLA Breached')}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-xs space-y-1">
              <p>Due: {due.toLocaleString()}</p>
              <p>Completed: {completed.toLocaleString()}</p>
              <p className={wasOnTime ? 'text-green-600' : 'text-red-600'}>
                {wasOnTime 
                  ? `Completed ${formatDistanceToNow(due, { addSuffix: false })} before deadline`
                  : `Completed ${formatDistanceToNow(due, { addSuffix: false })} after deadline`
                }
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // For open tickets, check if overdue or approaching due
  const hoursRemaining = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
  const isOverdue = hoursRemaining < 0;
  const isAtRisk = hoursRemaining > 0 && hoursRemaining < 24;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant={isOverdue ? 'destructive' : isAtRisk ? 'secondary' : 'outline'}
            className="gap-1 cursor-help"
          >
            {isOverdue ? (
              <AlertTriangle className="h-3 w-3" />
            ) : isAtRisk ? (
              <Timer className="h-3 w-3" />
            ) : (
              <Clock className="h-3 w-3" />
            )}
            {showLabel && (
              isOverdue ? 'Overdue' : 
              isAtRisk ? 'Due Soon' : 
              'On Track'
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-xs space-y-1">
            <p>Due: {due.toLocaleString()}</p>
            <p className={isOverdue ? 'text-red-600' : isAtRisk ? 'text-amber-600' : 'text-green-600'}>
              {isOverdue 
                ? `Overdue by ${formatDistanceToNow(due)}`
                : `Due ${formatDistanceToNow(due, { addSuffix: true })}`
              }
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
