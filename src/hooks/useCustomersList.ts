import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const sel = (s: string): string => s;

export interface CustomerListRow {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  /** Most recent interaction timestamp across conversations. */
  last_activity_at: string | null;
  conversation_count: number;
  /** Distinct statuses across this customer's conversations (open/pending/closed). */
  statuses: string[];
  /** Distinct brand labels derived from widget conversations. */
  brands: string[];
}

/** Display name used for alphabetical ordering. */
export function customerSortName(c: CustomerListRow): string {
  return (c.full_name || c.email || c.phone || '\uffff').trim().toLowerCase();
}

/**
 * Lists customers for the current organization with a lightweight activity
 * roll-up so agents can see who has been in touch most recently.
 */
export function useCustomersList(search?: string) {
  const { profile } = useAuth();
  const organizationId = profile?.organization_id;
  const term = (search || '').trim();

  return useQuery({
    queryKey: ['customers-list', organizationId, term],
    enabled: !!organizationId,
    queryFn: async (): Promise<CustomerListRow[]> => {
      let query = (supabase.from('customers') as any)
        .select(sel('id, full_name, email, phone, created_at'))
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (term) {
        const escaped = term.replace(/[%,()]/g, '');
        query = query.or(
          `full_name.ilike.%${escaped}%,email.ilike.%${escaped}%,phone.ilike.%${escaped}%`,
        );
      }

      const { data, error } = await query;
      if (error) throw error;

      const customers = (data ?? []) as Array<Omit<CustomerListRow, 'last_activity_at' | 'conversation_count'>>;
      if (customers.length === 0) return [];

      const ids = customers.map((c) => c.id);
      const { data: convs } = await (supabase.from('conversations') as any)
        .select(sel('id, customer_id, updated_at'))
        .in('customer_id', ids)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(1000);

      const stats = new Map<string, { last: string | null; count: number }>();
      ((convs ?? []) as Array<{ customer_id: string | null; updated_at: string }>).forEach((c) => {
        if (!c.customer_id) return;
        const prev = stats.get(c.customer_id);
        if (!prev) stats.set(c.customer_id, { last: c.updated_at, count: 1 });
        else {
          prev.count += 1;
          if (!prev.last || c.updated_at > prev.last) prev.last = c.updated_at;
        }
      });

      return customers
        .map((c) => ({
          ...c,
          last_activity_at: stats.get(c.id)?.last ?? null,
          conversation_count: stats.get(c.id)?.count ?? 0,
        }))
        .sort((a, b) => {
          const av = a.last_activity_at || a.created_at;
          const bv = b.last_activity_at || b.created_at;
          return bv.localeCompare(av);
        });
    },
  });
}
