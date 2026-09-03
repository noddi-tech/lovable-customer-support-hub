import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback, useMemo } from "react"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import { type Tag, useTags } from "@/hooks/useTags"
import { supabase } from "@/integrations/supabase/client"
import { logger } from "@/utils/logger"

export type TaggableEntity = "conversation" | "call" | "case" | "customer"

interface TagLinkRow {
  tag_id: string
  entity_id: string
}

/**
 * Loads and mutates tag assignments for one entity type.
 *
 * Links for the whole entity type are fetched once and cached, so every list
 * row and detail view can look up its tags without extra requests.
 */
export function useEntityTags(entityType: TaggableEntity) {
  const { profile } = useAuth()
  const organizationId = profile?.organization_id ?? null
  const queryClient = useQueryClient()
  const { tags } = useTags()

  const { data: links = [] } = useQuery({
    queryKey: ["tag-links", entityType, organizationId],
    enabled: !!organizationId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<TagLinkRow[]> => {
      const { data, error } = await supabase
        .from("tag_links")
        .select("tag_id, entity_id")
        .eq("entity_type", entityType)
      if (error) throw error
      return (data || []) as TagLinkRow[]
    },
  })

  const tagsById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])

  const tagsByEntity = useMemo(() => {
    const map = new Map<string, Tag[]>()
    links.forEach((link) => {
      const tag = tagsById.get(link.tag_id)
      if (!tag) return
      const list = map.get(link.entity_id) || []
      list.push(tag)
      map.set(link.entity_id, list)
    })
    map.forEach((list) => {
      list.sort((a, b) => a.name.localeCompare(b.name))
    })
    return map
  }, [links, tagsById])

  const getTags = useCallback(
    (entityId?: string | null): Tag[] => {
      if (!entityId) return []
      return tagsByEntity.get(entityId) || []
    },
    [tagsByEntity],
  )

  /** Mirror call tags onto the Aircall call (brand + custom tags). Best effort. */
  const syncAircall = useCallback(
    async (entityId: string) => {
      if (entityType !== "call") return
      try {
        const { error } = await supabase.functions.invoke("aircall-tag-call", {
          body: { callId: entityId },
        })
        if (error) throw error
      } catch (error) {
        logger.warn("Failed to sync call tags to Aircall", error, "useEntityTags")
      }
    },
    [entityType],
  )

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["tag-links"] })
  }, [queryClient])

  const addTag = useCallback(
    async (entityId: string, tagId: string) => {
      if (!organizationId) return
      try {
        const { error } = await supabase.from("tag_links").insert({
          tag_id: tagId,
          entity_id: entityId,
          entity_type: entityType,
          organization_id: organizationId,
        })
        if (error && !`${error.message}`.includes("duplicate")) throw error
        invalidate()
        void syncAircall(entityId)
      } catch (error) {
        logger.error("Failed to add tag", error, "useEntityTags")
        toast.error("Failed to add tag")
      }
    },
    [entityType, invalidate, organizationId, syncAircall],
  )

  const removeTag = useCallback(
    async (entityId: string, tagId: string) => {
      try {
        const { error } = await supabase
          .from("tag_links")
          .delete()
          .eq("entity_id", entityId)
          .eq("entity_type", entityType)
          .eq("tag_id", tagId)
        if (error) throw error
        invalidate()
        void syncAircall(entityId)
      } catch (error) {
        logger.error("Failed to remove tag", error, "useEntityTags")
        toast.error("Failed to remove tag")
      }
    },
    [entityType, invalidate, syncAircall],
  )

  const toggleTag = useCallback(
    async (entityId: string, tagId: string) => {
      const has = getTags(entityId).some((t) => t.id === tagId)
      if (has) await removeTag(entityId, tagId)
      else await addTag(entityId, tagId)
    },
    [addTag, getTags, removeTag],
  )

  return { tags, getTags, addTag, removeTag, toggleTag, tagsByEntity }
}
