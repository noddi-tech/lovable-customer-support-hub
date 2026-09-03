import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { logger } from "@/utils/logger"

export interface Tag {
  id: string
  name: string
  color: string
  organization_id: string
}

export const TAG_COLORS = [
  "#6366f1",
  "#0ea5e9",
  "#14b8a6",
  "#22c55e",
  "#eab308",
  "#f97316",
  "#ef4444",
  "#ec4899",
  "#a855f7",
  "#64748b",
]

/** Organization-wide custom tags (name + color) shared by every taggable entity. */
export function useTags() {
  const { profile } = useAuth()
  const organizationId = profile?.organization_id ?? null
  const queryClient = useQueryClient()

  const { data: tags = [], isLoading } = useQuery({
    queryKey: ["tags", organizationId],
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<Tag[]> => {
      const { data, error } = await supabase
        .from("tags")
        .select("id, name, color, organization_id")
        .order("name")
      if (error) throw error
      return data || []
    },
  })

  const invalidate = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["tags"] })
    void queryClient.invalidateQueries({ queryKey: ["tag-links"] })
  }, [queryClient])

  const createTag = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      if (!organizationId) throw new Error("No organization")
      const { data, error } = await supabase
        .from("tags")
        .insert({ name: name.trim(), color, organization_id: organizationId })
        .select("id, name, color, organization_id")
        .single()
      if (error) throw error
      return data
    },
    onSuccess: (tag) => {
      toast.success(`Tag "${tag.name}" created`)
      invalidate()
    },
    onError: (error: unknown) => {
      logger.error("Failed to create tag", error, "useTags")
      toast.error("Failed to create tag (name may already exist)")
    },
  })

  const updateTag = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name?: string; color?: string }) => {
      const payload: Record<string, string> = {}
      if (name !== undefined) payload.name = name.trim()
      if (color !== undefined) payload.color = color
      const { error } = await supabase.from("tags").update(payload).eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Tag updated")
      invalidate()
    },
    onError: (error: unknown) => {
      logger.error("Failed to update tag", error, "useTags")
      toast.error("Failed to update tag (admin access required)")
    },
  })

  const deleteTag = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tags").delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success("Tag deleted")
      invalidate()
    },
    onError: (error: unknown) => {
      logger.error("Failed to delete tag", error, "useTags")
      toast.error("Failed to delete tag (admin access required)")
    },
  })

  return { tags, isLoading, organizationId, createTag, updateTag, deleteTag }
}
