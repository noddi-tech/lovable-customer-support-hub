import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { ProfileId, AuthUserId } from '@/types/ids';

/**
 * Agent interface with properly typed IDs
 * 
 * IMPORTANT:
 * - Use `id` (ProfileId) for foreign key references like assigned_to_id
 * - Use `user_id` (AuthUserId) for auth.uid() comparisons only
 */
export interface Agent {
  /** Primary key of profiles table - USE THIS for foreign key references */
  id: ProfileId;
  /** Auth service user ID - use for auth comparisons only */
  user_id: AuthUserId;
  full_name: string;
  avatar_url?: string | null;
  email?: string | null;
  role?: string | null;
}

interface UseAgentsOptions {
  enabled?: boolean;
}

/**
 * Shared hook to fetch active agents with properly typed IDs
 * 
 * This hook ensures that both `id` (ProfileId) and `user_id` (AuthUserId) 
 * are available, preventing the common mistake of using `user_id` for 
 * foreign key references.
 * 
 * @example
 * const { data: agents } = useAgents();
 * 
 * // For assignments (foreign keys), use agent.id
 * <SelectItem value={agent.id}>{agent.full_name}</SelectItem>
 * 
 * // For auth comparisons, use agent.user_id
 * const isCurrentUser = agent.user_id === currentAuthUserId;
 */
export const useAgents = (options?: UseAgentsOptions) => {
  return useQuery({
    queryKey: ['agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, avatar_url, email, role')
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      return (data || []) as Agent[];
    },
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000, // 5 minutes - agents don't change frequently
  });
};

/**
 * Convenience type for components that only need id and name
 * Used by contexts that expose a simpler agents array
 */
export interface AgentSimple {
  /** ProfileId - use for foreign key references */
  id: string;
  name: string;
}

/**
 * Helper to convert Agent[] to AgentSimple[] for backward compatibility
 */
export const toAgentSimple = (agents: Agent[]): AgentSimple[] => 
  agents.map(agent => ({
    id: agent.id,
    name: agent.full_name,
  }));
