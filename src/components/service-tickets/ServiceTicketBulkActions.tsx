import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  MoreHorizontal, 
  CheckCircle2, 
  XCircle, 
  UserPlus,
  AlertTriangle,
  Archive,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ServiceTicketStatus, ServiceTicketPriority } from '@/types/service-tickets';

interface ServiceTicketBulkActionsProps {
  selectedTicketIds: string[];
  onClearSelection: () => void;
  onBulkUpdate: (updates: BulkUpdateData) => Promise<void>;
  onDelete?: () => Promise<void>;
  isDeleting?: boolean;
  availableAssignees?: Array<{ id: string; name: string }>;
}

export interface BulkUpdateData {
  status?: ServiceTicketStatus;
  priority?: ServiceTicketPriority;
  assignedTo?: string;
}

export const ServiceTicketBulkActions = ({
  selectedTicketIds,
  onClearSelection,
  onBulkUpdate,
  onDelete,
  isDeleting = false,
  availableAssignees = [],
}: ServiceTicketBulkActionsProps) => {
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showPriorityDialog, setShowPriorityDialog] = useState(false);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ServiceTicketStatus>('open');
  const [selectedPriority, setSelectedPriority] = useState<ServiceTicketPriority>('normal');
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Component is now only rendered when selection mode is active in parent
  if (selectedTicketIds.length === 0) {
    return (
      <div className="flex items-center justify-center p-4 bg-muted/50 rounded-lg border border-dashed">
        <p className="text-sm text-muted-foreground">Select tickets to perform bulk actions</p>
      </div>
    );
  }

  const handleBulkStatusUpdate = async () => {
    setIsProcessing(true);
    try {
      await onBulkUpdate({ status: selectedStatus });
      toast.success(`Updated ${selectedTicketIds.length} ticket(s) to ${selectedStatus}`);
      setShowStatusDialog(false);
      onClearSelection();
    } catch (error) {
      toast.error('Failed to update tickets');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkPriorityUpdate = async () => {
    setIsProcessing(true);
    try {
      await onBulkUpdate({ priority: selectedPriority });
      toast.success(`Updated ${selectedTicketIds.length} ticket(s) priority to ${selectedPriority}`);
      setShowPriorityDialog(false);
      onClearSelection();
    } catch (error) {
      toast.error('Failed to update tickets');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkAssign = async () => {
    if (!selectedAssignee) {
      toast.error('Please select an assignee');
      return;
    }
    setIsProcessing(true);
    try {
      await onBulkUpdate({ assignedTo: selectedAssignee });
      const assigneeName = availableAssignees.find(a => a.id === selectedAssignee)?.name;
      toast.success(`Assigned ${selectedTicketIds.length} ticket(s) to ${assigneeName}`);
      setShowAssignDialog(false);
      onClearSelection();
    } catch (error) {
      toast.error('Failed to assign tickets');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 p-4 bg-primary/10 border-b">
        <Badge variant="default" className="rounded-full">
          {selectedTicketIds.length} selected
        </Badge>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="h-4 w-4 mr-2" />
              Bulk Actions
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={() => setShowStatusDialog(true)}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Update Status
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowPriorityDialog(true)}>
              <AlertTriangle className="h-4 w-4 mr-2" />
              Change Priority
            </DropdownMenuItem>
            {availableAssignees.length > 0 && (
              <DropdownMenuItem onClick={() => setShowAssignDialog(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Assign To
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setShowDeleteDialog(true)} className="text-destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Tickets
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          <XCircle className="h-4 w-4 mr-2" />
          Clear Selection
        </Button>
      </div>

      {/* Status Update Dialog */}
      <AlertDialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Update Ticket Status</AlertDialogTitle>
            <AlertDialogDescription>
              Change the status for {selectedTicketIds.length} selected ticket(s).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as ServiceTicketStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="pending_customer">Pending Customer</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkStatusUpdate} disabled={isProcessing}>
              {isProcessing ? 'Updating...' : 'Update Status'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Priority Update Dialog */}
      <AlertDialog open={showPriorityDialog} onOpenChange={setShowPriorityDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change Ticket Priority</AlertDialogTitle>
            <AlertDialogDescription>
              Change the priority for {selectedTicketIds.length} selected ticket(s).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={selectedPriority} onValueChange={(value) => setSelectedPriority(value as ServiceTicketPriority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkPriorityUpdate} disabled={isProcessing}>
              {isProcessing ? 'Updating...' : 'Update Priority'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Assign Dialog */}
      <AlertDialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Assign Tickets</AlertDialogTitle>
            <AlertDialogDescription>
              Assign {selectedTicketIds.length} selected ticket(s) to a team member.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
              <SelectTrigger>
                <SelectValue placeholder="Select assignee..." />
              </SelectTrigger>
              <SelectContent>
                {availableAssignees.map((assignee) => (
                  <SelectItem key={assignee.id} value={assignee.id}>
                    {assignee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleBulkAssign} disabled={isProcessing}>
              {isProcessing ? 'Assigning...' : 'Assign Tickets'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={(open) => !isDeleting && setShowDeleteDialog(open)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Tickets</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedTicketIds.length} selected ticket(s)? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {isDeleting && (
            <div className="py-4">
              <div className="flex items-center justify-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">
                  Deleting {selectedTicketIds.length} ticket(s)...
                </p>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                if (onDelete) {
                  await onDelete();
                  setShowDeleteDialog(false);
                  onClearSelection();
                }
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
