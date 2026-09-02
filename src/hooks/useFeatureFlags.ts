import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import type { FeatureFlagRecord, FlagTargeting, FlagValueType } from "@/lib/feature-flags/types"

const normalize = (row: Record<string, unknown>): FeatureFlagRecord => ({
  ...(row as unknown as FeatureFlagRecord),
  variants: (row.variants ?? {}) as Record<string, unknown>,
  targeting: (row.targeting ?? {}) as FlagTargeting,
  value_type: (row.value_type ?? "boolean") as FlagValueType,
})

/** All flags visible to the current user (org flags + global defaults). */
export function useFeatureFlagList() {
  const { organizationId } = useAuth()

  return useQuery({
    queryKey: ["feature-flags", organizationId],
    enabled: !!organizationId,
    staleTime: 60_000,
    queryFn: async (): Promise<FeatureFlagRecord[]> => {
      const { data, error } = await supabase
        .from("feature_flags")
        .select("*")
        .or(`organization_id.eq.${organizationId},organization_id.is.null`)
        .order("key", { ascending: true })
      if (error) throw error

      // Org-specific rows override global rows with the same key.
      const byKey = new Map<string, FeatureFlagRecord>()
      for (const row of (data ?? []) as Record<string, unknown>[]) {
        const flag = normalize(row)
        const existing = byKey.get(flag.key)
        if (!existing || (!existing.organization_id && flag.organization_id)) {
          byKey.set(flag.key, flag)
        }
      }
      return Array.from(byKey.values()).sort((a, b) => a.key.localeCompare(b.key))
    },
  })
}

export interface UpsertFlagInput {
  id?: string
  key: string
  name?: string | null
  description?: string | null
  enabled?: boolean
  value_type?: FlagValueType
  variants?: Record<string, unknown>
  default_variant?: string
  targeting?: FlagTargeting
}

export function useFeatureFlagMutations() {
  const { organizationId } = useAuth()
  const queryClient = useQueryClient()
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["feature-flags"] })

  const upsertFlag = useMutation({
    mutationFn: async (input: UpsertFlagInput) => {
      const payload = {
        organization_id: organizationId,
        key: input.key.trim(),
        name: input.name ?? null,
        description: input.description ?? null,
        enabled: input.enabled ?? false,
        value_type: input.value_type ?? "boolean",
        variants: (input.variants ?? { on: true, off: false }) as never,
        default_variant: input.default_variant ?? "off",
        targeting: (input.targeting ?? {}) as never,
      }

      if (input.id) {
        const { error } = await supabase.from("feature_flags").update(payload).eq("id", input.id)
        if (error) throw error
        return
      }

      const { error } = await supabase.from("feature_flags").insert(payload)
      if (error) throw error
    },
    onSuccess: () => {
      invalidate()
      toast.success("Feature flag saved")
    },
    onError: (e: Error) => toast.error(e.message || "Could not save the flag"),
  })

  const toggleFlag = useMutation({
    mutationFn: async ({ flag, enabled }: { flag: FeatureFlagRecord; enabled: boolean }) => {
      // Global flags cannot be edited in place — fork them into this org.
      if (!flag.organization_id) {
        const { error } = await supabase.from("feature_flags").insert({
          organization_id: organizationId,
          key: flag.key,
          name: flag.name,
          description: flag.description,
          enabled,
          value_type: flag.value_type,
          variants: flag.variants as never,
          default_variant: flag.default_variant,
          targeting: flag.targeting as never,
        })
        if (error) throw error
        return
      }
      const { error } = await supabase.from("feature_flags").update({ enabled }).eq("id", flag.id)
      if (error) throw error
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message || "Could not update the flag"),
  })

  const deleteFlag = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("feature_flags").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      invalidate()
      toast.success("Feature flag deleted")
    },
    onError: (e: Error) => toast.error(e.message || "Could not delete the flag"),
  })

  return { upsertFlag, toggleFlag, deleteFlag }
}
