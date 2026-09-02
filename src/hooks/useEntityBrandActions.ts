import { useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import { toast } from "sonner"
import { supabase } from "@/integrations/supabase/client"
import { logger } from "@/utils/logger"

interface EntityBrandOptions {
  /** Table holding a `metadata` json column (`conversations` or `calls`). */
  table: "conversations" | "calls"
  /** Query keys to invalidate once the brand changed. */
  invalidateKeys: string[]
  /** Context label for logging. */
  context: string
  /** Optional side effect (e.g. mirroring the brand to Aircall). */
  afterSet?: (entityId: string, brandName: string | null) => Promise<void>
}

/**
 * Shared implementation for brand categorisation. The brand name is stored on
 * `<table>.metadata.brand`, so badges, logos and theme colors resolve the same
 * way across email, chat and voice.
 */
export function useEntityBrandActions({
  table,
  invalidateKeys,
  context,
  afterSet,
}: EntityBrandOptions) {
  const queryClient = useQueryClient()

  const setBrand = useCallback(
    async (entityId: string, brandName: string | null) => {
      try {
        const { data: existing, error: readError } = await supabase
          .from(table)
          .select("metadata")
          .eq("id", entityId)
          .maybeSingle()

        if (readError) throw readError

        const metadata = { ...((existing?.metadata as Record<string, unknown>) || {}) }
        if (brandName) {
          metadata.brand = brandName
          metadata.brand_source = "manual"
        } else {
          delete metadata.brand
          delete metadata.brand_name
          delete metadata.brand_source
        }

        const { error } = await supabase
          .from(table)
          .update({ metadata: metadata as never })
          .eq("id", entityId)

        if (error) throw error

        toast.success(brandName ? `Brand set to ${brandName}` : "Brand cleared")
        invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }))

        await afterSet?.(entityId, brandName)
      } catch (error) {
        logger.error("Failed to set brand", error, context)
        toast.error("Failed to set brand")
      }
    },
    [queryClient, table, invalidateKeys, context, afterSet],
  )

  return { setBrand }
}
