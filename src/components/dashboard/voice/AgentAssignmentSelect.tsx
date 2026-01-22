import React from 'react';
import { Users, UserCheck } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ProfileId } from '@/types/ids';

/**
 * Agent interface - uses ProfileId (profiles.id) for assignments
 * NOT user_id which is the Auth service ID
 */
interface Agent {
  id: string; // ProfileId - the primary key, used for foreign key references
  user_id: string; // AuthUserId - kept for reference but NOT used for assignments
  full_name: string;
  avatar_url?: string;
}

interface AgentAssignmentSelectProps {
  currentAssigneeId?: string; // This should be a ProfileId
  onAssign: (agentId: string) => void; // Passes ProfileId
  isAssigning?: boolean;
  placeholder?: string;
}

export const AgentAssignmentSelect: React.FC<AgentAssignmentSelectProps> = ({
  currentAssigneeId,
  onAssign,
  isAssigning = false,
  placeholder = "Assign to agent"
}) => {
  const { data: agents = [], isLoading: loadingAgents } = useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      // IMPORTANT: Fetch 'id' (ProfileId) for assignments, not just user_id
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, avatar_url')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      return data as Agent[];
    },
  });

  // Match by ProfileId (profiles.id), not user_id
  const currentAssignee = agents.find(agent => agent.id === currentAssigneeId);

  return (
    <div className="flex items-center gap-2">
      {currentAssignee ? (
        <div className="flex items-center gap-2 px-2 py-1 bg-muted rounded-md">
          <Avatar className="h-6 w-6">
            <AvatarImage src={currentAssignee.avatar_url} />
            <AvatarFallback className="text-xs">
              {currentAssignee.full_name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{currentAssignee.full_name}</span>
          <UserCheck className="h-4 w-4 text-green-600" />
        </div>
      ) : (
        <Select
          value={currentAssigneeId || ''}
          onValueChange={onAssign}
          disabled={isAssigning || loadingAgents}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={placeholder}>
              {loadingAgents ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span>Loading...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{placeholder}</span>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {agents.map((agent) => (
              // Use agent.id (ProfileId) NOT agent.user_id for assignments
              <SelectItem key={agent.id} value={agent.id}>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={agent.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {agent.full_name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <span>{agent.full_name}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      
      {currentAssignee && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAssign('')}
          disabled={isAssigning}
        >
          Unassign
        </Button>
      )}
    </div>
  );
};