import { useQueryClient } from "@tanstack/react-query"
import { Loader2, Send } from "lucide-react"
import type React from "react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { useSendRecruitmentEmail } from "@/hooks/recruitment/useRecruitmentEmail"
import { EmailTemplateTipTap } from "../admin/templates/EmailTemplateTipTap"

interface Props {
  conversationId: string
  applicantId: string
  inboxId: string
  subjectHint?: string | null
}

export const InlineReplyBox: React.FC<Props> = ({
  conversationId,
  applicantId,
  inboxId,
  subjectHint,
}) => {
  const [body, setBody] = useState("")
  const sendMut = useSendRecruitmentEmail()
  const qc = useQueryClient()

  const handleSend = async () => {
    if (!body.trim()) return
    try {
      await sendMut.mutateAsync({
        applicant_id: applicantId,
        conversation_id: conversationId,
        inbox_id: inboxId,
        subject: subjectHint
          ? subjectHint.startsWith("Re:")
            ? subjectHint
            : `Re: ${subjectHint}`
          : "Re:",
        body_html: body,
      })
      toast.success("Svar sendt")
      setBody("")
      void qc.invalidateQueries({ queryKey: ["applicant-conversation-messages", conversationId] })
      void qc.invalidateQueries({ queryKey: ["applicant-conversations", applicantId] })
    } catch (e: any) {
      toast.error(e?.message || "Sending feilet")
    }
  }

  return (
    <div className="border-t border-border bg-muted/30 p-3 space-y-2">
      <EmailTemplateTipTap value={body} onChange={setBody} placeholder="Skriv et svar…" />
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={handleSend}
          disabled={!body.trim() || sendMut.isPending || !inboxId}
        >
          {sendMut.isPending ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Send className="h-3.5 w-3.5 mr-1.5" />
          )}
          Send svar
        </Button>
      </div>
    </div>
  )
}

export default InlineReplyBox
