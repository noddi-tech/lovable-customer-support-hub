import React from 'react';
import { Users, UserCheck } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Agent {
  user_id: string;
  full_name: string;
  avatar_url?: string;
}

interface AgentAssignmentSelectProps {
  currentAssigneeId?: string;
  onAssign: (agentId: string) => void;
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
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, avatar_url')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      return data as Agent[];
    },
  });

  const currentAssignee = agents.find(agent => agent.user_id === currentAssigneeId);

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
              <SelectItem key={agent.user_id} value={agent.user_id}>
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