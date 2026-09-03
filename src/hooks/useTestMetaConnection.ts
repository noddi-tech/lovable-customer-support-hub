import { useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  MetaHealthCheckResult,
  MetaTokenTestResult,
} from "@/components/dashboard/recruitment/admin/integrations/types"
import { supabase } from "@/integrations/supabase/client"

export function useTestMetaConnection(integrationId: string | null | undefined) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (): Promise<MetaHealthCheckResult> => {
      if (!integrationId) throw new Error("Mangler integration_id")
      const { data, error } = await supabase.functions.invoke("meta-integration-health-check", {
        body: { integration_id: integrationId },
      })
      if (error) throw new Error(error.message ?? "Helsesjekk feilet")
      if (data?.error) throw new Error(data.error)
      return data as MetaHealthCheckResult
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["meta-integration-health", integrationId] })
      qc.invalidateQueries({ queryKey: ["recruitment-meta-integration"] })
    },
  })
}

export function useTestMetaToken() {
  return useMutation({
    mutationFn: async (input: {
      integration_id: string
      candidate_token: string
    }): Promise<MetaTokenTestResult> => {
      const { data, error } = await supabase.functions.invoke("meta-integration-test-token", {
        body: input,
      })
      if (error) throw new Error(error.message ?? "Token-validering feilet")
      if (data?.error && typeof data.valid !== "boolean") {
        throw new Error(data.error)
      }
      return data as MetaTokenTestResult
    },
  })
}
