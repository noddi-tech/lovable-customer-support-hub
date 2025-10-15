import React from 'react';
import { CheckCircle2, Trash2, UserPlus, Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface BulkActionsBarProps {
  selectedCount: number;
  onMarkResolved: () => void;
  onAssignAgent: () => void;
  onExport: () => void;
  onDelete?: () => void;
  onClearSelection: () => void;
  className?: string;
}

export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  onMarkResolved,
  onAssignAgent,
  onExport,
  onDelete,
  onClearSelection,
  className,
}) => {
  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'bg-card border border-border rounded-lg shadow-lg',
        'px-4 py-3 flex items-center gap-3',
        'animate-in slide-in-from-bottom-5 duration-300',
        className
      )}
    >
      {/* Selection count */}
      <div className="flex items-center gap-2 pr-3 border-r border-border">
        <Badge variant="secondary" className="h-6">
          {selectedCount}
        </Badge>
        <span className="text-sm font-medium">
          {selectedCount === 1 ? 'item selected' : 'items selected'}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onMarkResolved}
          className="h-8"
        >
          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
          Mark Resolved
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onAssignAgent}
          className="h-8"
        >
          <UserPlus className="h-3.5 w-3.5 mr-1.5" />
          Assign
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onExport}
          className="h-8"
        >
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Export
        </Button>

        {onDelete && (
          <Button
            variant="outline"
            size="sm"
            onClick={onDelete}
            className="h-8 text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Delete
          </Button>
        )}
      </div>

      {/* Clear selection */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onClearSelection}
        className="h-8 ml-1"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};
