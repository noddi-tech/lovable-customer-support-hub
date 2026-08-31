import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getConversationBrand } from '@/lib/conversationBrand';

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
        .select(sel('id, customer_id, updated_at, status, channel, metadata'))
        .in('customer_id', ids)
        .is('deleted_at', null)
        .order('updated_at', { ascending: false })
        .limit(1000);

      type ConvRow = {
        customer_id: string | null;
        updated_at: string;
        status: string | null;
        channel: string | null;
        metadata: unknown;
      };

      const stats = new Map<
        string,
        { last: string | null; count: number; statuses: Set<string>; brands: Set<string> }
      >();
      ((convs ?? []) as ConvRow[]).forEach((c) => {
        if (!c.customer_id) return;
        let entry = stats.get(c.customer_id);
        if (!entry) {
          entry = { last: null, count: 0, statuses: new Set(), brands: new Set() };
          stats.set(c.customer_id, entry);
        }
        entry.count += 1;
        if (!entry.last || c.updated_at > entry.last) entry.last = c.updated_at;
        if (c.status) entry.statuses.add(c.status);
        const brand = getConversationBrand(c.metadata, c.channel);
        if (brand) entry.brands.add(brand.label);
      });

      return customers
        .map((c) => {
          const entry = stats.get(c.id);
          return {
            ...c,
            last_activity_at: entry?.last ?? null,
            conversation_count: entry?.count ?? 0,
            statuses: entry ? Array.from(entry.statuses).sort() : [],
            brands: entry ? Array.from(entry.brands).sort() : [],
          };
        })
        .sort((a, b) => customerSortName(a).localeCompare(customerSortName(b)));
    },
  });
}
