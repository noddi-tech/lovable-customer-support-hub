import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"

export interface AircallSyncSummary {
  organizationId: string
  eligible: number
  created: number
  updated: number
  skipped: number
  failed: number
  remaining: number
  pending?: number
  dryRun?: boolean
  errors?: string[]
  error?: string
}

interface SyncResponse {
  success: boolean
  results?: AircallSyncSummary[]
  error?: string
}

async function invokeSync(body: Record<string, unknown>): Promise<AircallSyncSummary | null> {
  const { data, error } = await supabase.functions.invoke<SyncResponse>("aircall-sync-contacts", {
    body,
  })

  if (error) throw error
  if (data && data.success === false) throw new Error(data.error || "Sync failed")

  const summary = data?.results?.[0] ?? null
  if (summary?.error) throw new Error(summary.error)
  return summary
}

/**
 * Push customers (name + phone) to Aircall as company contacts so incoming
 * calls display the customer name.
 */
export function useAircallContactSync(enabled: boolean) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const preview = useQuery({
    queryKey: ["aircall-contact-sync-preview"],
    queryFn: () => invokeSync({ dryRun: true }),
    enabled,
    staleTime: 60_000,
    retry: false,
  })

  const syncMutation = useMutation({
    mutationFn: (options?: { force?: boolean; limit?: number }) =>
      invokeSync({ force: options?.force ?? false, limit: options?.limit ?? 100 }),
    onSuccess: (summary) => {
      queryClient.invalidateQueries({ queryKey: ["aircall-contact-sync-preview"] })
      if (!summary) return
      toast({
        title: "Aircall contact sync complete",
        description: `${summary.created} created, ${summary.updated} updated, ${summary.skipped} unchanged${
          summary.failed ? `, ${summary.failed} failed` : ""
        }${summary.remaining ? ` — ${summary.remaining} still queued` : ""}`,
      })
    },
    onError: (error: any) => {
      toast({
        title: "Aircall contact sync failed",
        description: error?.message || "Unable to sync customers to Aircall",
        variant: "destructive",
      })
    },
  })

  return {
    preview: preview.data,
    isLoadingPreview: preview.isLoading,
    previewError: preview.error,
    refetchPreview: preview.refetch,
    syncNow: syncMutation.mutate,
    lastResult: syncMutation.data,
    isSyncing: syncMutation.isPending,
  }
}
