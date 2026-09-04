import { useMutation } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"

export interface MissingField {
  field_id: string
  field_name: string
  field_type: string
  requirement_type: "required" | "optional"
  block_stage_progression: boolean
}

export interface StageProgressionResult {
  can_progress: boolean
  missing_required: MissingField[]
  missing_optional: MissingField[]
  can_override: boolean
}

export function useStageProgressionValidation() {
  return useMutation({
    mutationFn: async (input: {
      application_id: string
      target_stage_id: string
    }): Promise<StageProgressionResult> => {
      // Transport hiccups (cold start / dropped preflight) surface as
      // "Failed to send a request to the Edge Function" and would block a
      // kanban move. Retry once before giving up.
      let lastError: unknown = null
      for (let attempt = 0; attempt < 2; attempt++) {
        const { data, error } = await supabase.functions.invoke("validate-stage-progression", {
          body: input,
        })
        if (!error) {
          if (data?.error) throw new Error(data.error)
          return data as StageProgressionResult
        }
        lastError = error
        const isTransport = /failed to send a request|fetch|network/i.test(
          (error as Error)?.message ?? "",
        )
        if (!isTransport) break
        await new Promise((r) => setTimeout(r, 400))
      }
      throw lastError instanceof Error
        ? lastError
        : new Error("Kunne ikke validere fase-krav — prøv igjen")
    },
  })
}
