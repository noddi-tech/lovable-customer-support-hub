import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface InboxDefaults {
  /** Brand name new conversations get labelled with, if configured. */
  brand: string | null;
  /** Display name of the person new conversations are auto-assigned to. */
  assigneeName: string | null;
}

/**
 * Maps inbox id -> its configured auto-assignment defaults (brand + assignee),
 * resolving the assignee profile id to a readable name.
 */
export function useInboxDefaults() {
  return useQuery({
    queryKey: ['inbox-defaults'],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Record<string, InboxDefaults>> => {
      const { data: inboxes } = await supabase
        .from('inboxes')
        .select('id, auto_assignment_rules');

      const map: Record<string, InboxDefaults> = {};
      const profileIds = new Set<string>();

      for (const inbox of (inboxes as any[]) || []) {
        const rules = (inbox?.auto_assignment_rules || {}) as {
          assign_to_profile_id?: string | null;
          default_brand?: string | null;
        };
        const assigneeId = rules.assign_to_profile_id || null;
        if (assigneeId) profileIds.add(assigneeId);
        map[inbox.id] = {
          brand: rules.default_brand || null,
          assigneeName: assigneeId, // replaced below with the resolved name
        };
      }

      if (profileIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', Array.from(profileIds));

        const names = new Map<string, string>();
        for (const p of (profiles as any[]) || []) {
          names.set(p.id, p.full_name || p.email || 'Unknown');
        }

        for (const entry of Object.values(map)) {
          if (entry.assigneeName) {
            entry.assigneeName = names.get(entry.assigneeName) || null;
          }
        }
      }

      return map;
    },
  });
}
