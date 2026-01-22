import React from 'react';
import { Users, UserCheck } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAgents } from '@/hooks/useAgents';

interface AgentAssignmentSelectProps {
  /** ProfileId of the current assignee - use profiles.id, NOT user_id */
  currentAssigneeId?: string;
  /** Callback with ProfileId when agent is assigned */
  onAssign: (agentId: string) => void;
  isAssigning?: boolean;
  placeholder?: string;
}

/**
 * Agent assignment select component
 * 
 * IMPORTANT: This component uses profiles.id (ProfileId) for assignments,
 * which is the correct foreign key reference for assigned_to_id columns.
 * Do NOT use user_id here - that's for auth comparisons only.
 */
export const AgentAssignmentSelect: React.FC<AgentAssignmentSelectProps> = ({
  currentAssigneeId,
  onAssign,
  isAssigning = false,
  placeholder = "Assign to agent"
}) => {
  // Uses shared hook that fetches profiles.id correctly
  const { data: agents = [], isLoading: loadingAgents } = useAgents();

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