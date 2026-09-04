import { supabase } from "@/integrations/supabase/client"

/**
 * Invokes the `send-reply-email` edge function with a one-shot retry on
 * transport failures (cold-start `FunctionsFetchError`, 502/503, aborted
 * fetches). The function itself is idempotent per messageId — the second
 * attempt is safe because the first never reached SendGrid.
 */
export async function invokeSendReplyEmail(body: {
  messageId: string
  replyAll?: boolean
}): Promise<{ error: { message: string } | null }> {
  const isTransport = (err: unknown) => {
    const msg = String((err as { message?: string } | null)?.message || err || "")
    return (
      /Failed to send a request/i.test(msg) ||
      /Failed to fetch/i.test(msg) ||
      /NetworkError/i.test(msg) ||
      /ECONNRESET|ETIMEDOUT|502|503|504/i.test(msg)
    )
  }

  const attempt = async () => supabase.functions.invoke("send-reply-email", { body })

  const first = await attempt()
  if (!first.error) return { error: null }
  if (!isTransport(first.error)) return { error: first.error as { message: string } }

  await new Promise((r) => setTimeout(r, 800))
  const second = await attempt()
  return { error: (second.error as { message: string } | null) ?? null }
}
