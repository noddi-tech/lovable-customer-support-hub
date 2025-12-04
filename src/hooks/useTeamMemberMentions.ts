import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCallback, useMemo } from 'react';

export interface TeamMemberForMention {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
}

export const useTeamMemberMentions = () => {
  const { profile } = useAuth();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['team-members-for-mentions', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, email, avatar_url')
        .eq('organization_id', profile.organization_id)
        .eq('is_active', true)
        .order('full_name');

      if (error) throw error;
      return (data || []) as TeamMemberForMention[];
    },
    enabled: !!profile?.organization_id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const searchMembers = useCallback((query: string): TeamMemberForMention[] => {
    if (!query) return members;
    const lowerQuery = query.toLowerCase();
    return members.filter(
      (member) =>
        member.full_name?.toLowerCase().includes(lowerQuery) ||
        member.email?.toLowerCase().includes(lowerQuery)
    );
  }, [members]);

  // Parse content to extract mentioned user IDs
  const extractMentionedUserIds = useCallback((content: string): string[] => {
    const mentionPattern = /@([^@\n]+?)(?=\s|$|@)/g;
    const mentionedIds: string[] = [];
    let match;

    while ((match = mentionPattern.exec(content)) !== null) {
      const mentionedName = match[1].trim();
      const matchedMember = members.find(
        (m) => m.full_name?.toLowerCase() === mentionedName.toLowerCase()
      );
      if (matchedMember && !mentionedIds.includes(matchedMember.user_id)) {
        mentionedIds.push(matchedMember.user_id);
      }
    }

    return mentionedIds;
  }, [members]);

  return {
    members,
    isLoading,
    searchMembers,
    extractMentionedUserIds,
  };
};
