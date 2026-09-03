import { useQuery } from "@tanstack/react-query"
import { Loader2, Mail } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { supabase } from "@/integrations/supabase/client"

interface EmailPreviewDialogProps {
  messageId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface EmailPreviewResult {
  html: string
  subject: string | null
  to: string | null
  from: string | null
  fromName: string | null
}

/**
 * Shows the outgoing message exactly as the customer received it.
 * Conversation replies are plain text (optional signature); new outbound
 * emails use the branded layout (header, body, signature, footer) server-side.
 */
export function EmailPreviewDialog({ messageId, open, onOpenChange }: EmailPreviewDialogProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["email-preview", messageId],
    enabled: open && !!messageId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<EmailPreviewResult> => {
      const { data, error } = await supabase.functions.invoke("send-reply-email", {
        body: { messageId, preview: true },
      })
      if (error) throw error
      return data as EmailPreviewResult
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Mail className="h-4 w-4" />
            {data?.subject || "Email preview"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {data
              ? `From ${data.fromName ? `${data.fromName} <${data.from}>` : data.from} · To ${data.to}`
              : "How this reply looked in the customer’s inbox"}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Rendering email…
          </div>
        ) : error || !data?.html ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Could not render this email preview.
          </p>
        ) : (
          <iframe
            title="Email preview"
            sandbox=""
            srcDoc={data.html}
            className="h-[65vh] w-full rounded-md border bg-white"
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
