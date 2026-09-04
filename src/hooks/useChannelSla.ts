import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { SLA_PRIORITIES, type SlaPriority } from "@/hooks/useInboxSla"
import { supabase } from "@/integrations/supabase/client"
import { toastError } from "@/lib/errorToast"

export interface ChannelSlaPolicyRow {
  id: string
  inbox_id: string | null
  channel: string | null
  priority: SlaPriority
  first_response_minutes: number
  resolution_minutes: number
  is_active: boolean
}

/**
 * SLA targets that apply to one channel (e.g. live chat): the channel-specific
 * rows plus the organization defaults that apply when no channel row exists.
 */
export function useChannelSlaPolicies(channel: string, enabled = true) {
  return useQuery({
    queryKey: ["channel_sla_policies", channel],
    enabled,
    queryFn: async (): Promise<ChannelSlaPolicyRow[]> => {
      const { data, error } = await supabase.rpc("get_channel_sla_policies", {
        p_channel: channel,
      } as never)
      if (error) throw error
      return (data || []) as unknown as ChannelSlaPolicyRow[]
    },
  })
}

export function useSaveChannelSla(channel: string) {
  const queryClient = useQueryClient()

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["channel_sla_policies", channel] })
    void queryClient.invalidateQueries({ queryKey: ["inbox_support_metrics"] })
    void queryClient.invalidateQueries({ queryKey: ["sla_policies"] })
  }

  const save = useMutation({
    mutationFn: async (input: {
      priority: SlaPriority
      firstResponseMinutes: number
      resolutionMinutes: number
    }) => {
      const { error } = await supabase.rpc("upsert_channel_sla_policy", {
        p_channel: channel,
        p_priority: input.priority,
        p_first_response_minutes: input.firstResponseMinutes,
        p_resolution_minutes: input.resolutionMinutes,
        p_inbox_id: null,
        p_is_active: true,
      } as never)
      if (error) throw error
    },
    onSuccess: () => {
      invalidate()
      toast.success("Live chat SLA saved")
    },
    onError: (e: any) => toastError("Could not save SLA", e),
  })

  const reset = useMutation({
    mutationFn: async (priority: SlaPriority) => {
      const { error } = await supabase.rpc("delete_channel_sla_policy", {
        p_channel: channel,
        p_priority: priority,
        p_inbox_id: null,
      } as never)
      if (error) throw error
    },
    onSuccess: () => {
      invalidate()
      toast.success("Reverted to the general target")
    },
    onError: (e: any) => toastError("Could not reset SLA", e),
  })

  return { save, reset }
}

export { SLA_PRIORITIES, type SlaPriority }
