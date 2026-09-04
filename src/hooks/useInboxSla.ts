import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { toastError } from "@/lib/errorToast"
import { supabase } from "@/integrations/supabase/client"

export const SLA_PRIORITIES = ["urgent", "high", "normal", "low"] as const
export type SlaPriority = (typeof SLA_PRIORITIES)[number]

export interface SlaPolicyRow {
  id: string
  inbox_id: string | null
  priority: SlaPriority
  first_response_minutes: number
  resolution_minutes: number
  is_active: boolean
}

/**
 * SLA levels that apply to an inbox: the organization-wide defaults
 * (inbox_id IS NULL) plus any inbox-specific overrides.
 */
export function useInboxSlaPolicies(inboxId: string | undefined) {
  return useQuery({
    queryKey: ["sla_policies", inboxId],
    enabled: Boolean(inboxId),
    queryFn: async (): Promise<SlaPolicyRow[]> => {
      const { data, error } = await supabase
        .from("sla_policies")
        .select("id, inbox_id, priority, first_response_minutes, resolution_minutes, is_active")
        .or(`inbox_id.eq.${inboxId},inbox_id.is.null`)
      if (error) throw error
      return (data || []) as unknown as SlaPolicyRow[]
    },
  })
}

export function useSaveInboxSla(inboxId: string | undefined) {
  const queryClient = useQueryClient()

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["sla_policies", inboxId] })
    void queryClient.invalidateQueries({ queryKey: ["inbox_support_metrics"] })
  }

  const save = useMutation({
    mutationFn: async (input: {
      priority: SlaPriority
      firstResponseMinutes: number
      resolutionMinutes: number
    }) => {
      if (!inboxId) throw new Error("Missing inbox")
      const { error } = await supabase.rpc("upsert_inbox_sla_policy", {
        p_inbox_id: inboxId,
        p_priority: input.priority,
        p_first_response_minutes: input.firstResponseMinutes,
        p_resolution_minutes: input.resolutionMinutes,
        p_is_active: true,
      } as never)
      if (error) throw error
    },
    onSuccess: () => {
      invalidate()
      toast.success("SLA target saved")
    },
    onError: (e: any) => toastError("Could not save SLA", e),
  })

  const reset = useMutation({
    mutationFn: async (priority: SlaPriority) => {
      if (!inboxId) throw new Error("Missing inbox")
      const { error } = await supabase.rpc("delete_inbox_sla_policy", {
        p_inbox_id: inboxId,
        p_priority: priority,
      } as never)
      if (error) throw error
    },
    onSuccess: () => {
      invalidate()
      toast.success("Reverted to organization default")
    },
    onError: (e: any) => toastError("Could not reset SLA", e),
  })

  return { save, reset }
}
