import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "./useAuth"

/**
 * Per-user default inbox, stored on the user's profile.
 * Used to highlight the preferred inbox across the home view and selectors.
 */
export function useDefaultInbox() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ["default-inbox", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<string | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("default_inbox_id")
        .eq("user_id", user!.id)
        .maybeSingle()
      if (error) throw error
      return (data?.default_inbox_id as string | null) ?? null
    },
  })

  const mutation = useMutation({
    mutationFn: async (inboxId: string | null) => {
      const { error } = await supabase
        .from("profiles")
        .update({ default_inbox_id: inboxId })
        .eq("user_id", user!.id)
      if (error) throw error
      return inboxId
    },
    onSuccess: (inboxId) => {
      queryClient.setQueryData(["default-inbox", user?.id], inboxId)
      toast.success(inboxId ? "Default inbox updated" : "Default inbox cleared")
    },
    onError: (error: any) => {
      toast.error(error?.message || "Could not update default inbox")
    },
  })

  return {
    defaultInboxId: query.data ?? null,
    isLoading: query.isLoading,
    setDefaultInbox: mutation.mutate,
    isSaving: mutation.isPending,
  }
}
