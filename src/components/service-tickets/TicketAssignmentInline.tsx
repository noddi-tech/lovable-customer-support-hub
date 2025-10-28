import { useState } from 'react';
import { User } from 'lucide-react';
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

interface TicketAssignmentInlineProps {
  ticketId: string;
  currentAssigneeId?: string;
  currentAssigneeName?: string;
  onAssignmentChange?: () => void;
}

export const TicketAssignmentInline = ({
  ticketId,
  currentAssigneeId,
  currentAssigneeName,
  onAssignmentChange,
}: TicketAssignmentInlineProps) => {
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
    <div className="flex items-center gap-2 flex-1">
      {currentAssigneeId && currentAssigneeName ? (
        <>
          <Avatar className="h-6 w-6">
            <AvatarImage src={undefined} />
            <AvatarFallback className="bg-primary/10 text-xs">
              {currentAssigneeName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm">{currentAssigneeName}</span>
        </>
      ) : (
        <>
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Unassigned</span>
        </>
      )}
      
      <Select
        value={currentAssigneeId || 'unassigned'}
        onValueChange={handleAssign}
        disabled={isUpdating}
      >
        <SelectTrigger className="h-8 w-[140px]">
          <SelectValue placeholder="Change..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="unassigned">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Unassigned</span>
            </div>
          </SelectItem>
          {teamMembers.map((member) => (
            <SelectItem key={member.user_id} value={member.user_id}>
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
