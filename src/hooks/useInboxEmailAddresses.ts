import { useQuery } from "@tanstack/react-query"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"

/**
 * Maps inbox id -> the email address that inbox receives mail on.
 * Prefers an active connected email account, falls back to the inbound route
 * group email so inbox pickers can show e.g. "Noddi (hei@noddi.no)".
 */
export function useInboxEmailAddresses() {
  const { user, loading } = useAuth()

  return useQuery({
    queryKey: ["inbox-email-addresses"],
    // Without a session RLS returns nothing, and the empty result would be
    // persisted for 24h making every inbox look "Not configured".
    enabled: !!user && !loading,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: true,
    queryFn: async (): Promise<Record<string, string>> => {
      const map: Record<string, string> = {}

      const [accountsRes, routesRes] = await Promise.all([
        supabase.rpc("get_email_accounts"),
        supabase.from("inbound_routes").select("inbox_id, group_email, is_active"),
      ])

      // Surface failures so react-query retries instead of caching an empty map
      if (accountsRes.error && routesRes.error) throw accountsRes.error

      // Inbound routes first (lowest priority)
      for (const route of (routesRes.data as any[]) || []) {
        if (route?.inbox_id && route?.group_email && !map[route.inbox_id]) {
          map[route.inbox_id] = route.group_email
        }
      }

      // Connected email accounts win
      for (const acc of (accountsRes.data as any[]) || []) {
        if (!acc?.inbox_id || !acc?.email_address) continue
        if (acc.is_active === false && map[acc.inbox_id]) continue
        map[acc.inbox_id] = acc.email_address
      }

      return map
    },
  })
}
