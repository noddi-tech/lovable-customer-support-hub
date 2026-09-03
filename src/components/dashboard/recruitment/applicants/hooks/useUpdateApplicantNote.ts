import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useAuth } from "@/hooks/useAuth"
import { supabase } from "@/integrations/supabase/client"
import { useOrganizationStore } from "@/stores/organizationStore"

export function useUpdateApplicantNote() {
  const qc = useQueryClient()
  const { currentOrganizationId } = useOrganizationStore()
  const { profile } = useAuth()

  return useMutation({
    mutationFn: async (input: {
      noteId: string
      applicantId: string
      applicationId?: string | null
      content: string
      note_type: string
    }) => {
      if (!currentOrganizationId) throw new Error("Ingen organisasjon valgt")

      const { error: updErr } = await supabase
        .from("applicant_notes")
        .update({ content: input.content, note_type: input.note_type })
        .eq("id", input.noteId)
      if (updErr) throw updErr

      if (input.applicationId && profile?.id) {
        await supabase.from("application_events").insert({
          application_id: input.applicationId,
          applicant_id: input.applicantId,
          organization_id: currentOrganizationId,
          event_type: "note_edited",
          event_data: {
            note_id: input.noteId,
            note_type: input.note_type,
            preview: input.content.slice(0, 100),
          },
          performed_by: profile.id,
        })
      }
    },
    onSuccess: (_d, vars) => {
      void qc.invalidateQueries({ queryKey: ["applicant-notes", vars.applicantId] })
      void qc.invalidateQueries({ queryKey: ["applicant-events", vars.applicantId] })
      void qc.invalidateQueries({ queryKey: ["recruitment-audit-events"] })
      toast.success("Notat oppdatert")
    },
    onError: (err: any) => {
      toast.error(err?.message || "Kunne ikke oppdatere notat")
    },
  })
}
