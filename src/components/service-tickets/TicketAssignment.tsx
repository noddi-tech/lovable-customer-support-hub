import { useState } from 'react';
import { User, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TicketAssignmentProps {
  ticketId: string;
  currentAssigneeId?: string;
  currentAssigneeName?: string;
  onAssignmentChange?: () => void;
}

export const TicketAssignment = ({
  ticketId,
  currentAssigneeId,
  currentAssigneeName,
  onAssignmentChange,
}: TicketAssignmentProps) => {
  const { data: teamMembers = [] } = useTeamMembers();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleAssign = async (userId: string) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('service_tickets')
        .update({ assigned_to_id: userId || null })
        .eq('id', ticketId);

      if (error) throw error;

      const assignee = teamMembers.find(m => m.user_id === userId);
      toast.success(
        userId
          ? `Assigned to ${assignee?.full_name || 'team member'}`
          : 'Unassigned ticket'
      );
      onAssignmentChange?.();
    } catch (error) {
      console.error('Assignment error:', error);
      toast.error('Failed to update assignment');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Assigned To</label>
      <div className="flex items-center gap-2">
        {currentAssigneeId && currentAssigneeName ? (
          <div className="flex items-center gap-2 flex-1">
            <Avatar className="h-8 w-8">
              <AvatarImage src={undefined} />
              <AvatarFallback className="bg-primary/10">
                {currentAssigneeName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{currentAssigneeName}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground flex-1">
            <User className="h-4 w-4" />
            <span className="text-sm">Unassigned</span>
          </div>
        )}
      </div>
      
      <Select
        value={currentAssigneeId || 'unassigned'}
        onValueChange={handleAssign}
        disabled={isUpdating}
      >
        <SelectTrigger>
          <SelectValue placeholder="Select team member..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Unassigned</span>
            </div>
          </SelectItem>
          {teamMembers.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={member.avatar_url} />
                  <AvatarFallback className="bg-primary/10 text-xs">
                    {member.full_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>{member.full_name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
