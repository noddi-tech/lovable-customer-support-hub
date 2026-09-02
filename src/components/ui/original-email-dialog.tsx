import { Code2, ExternalLink } from "lucide-react"
import type React from "react"
import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import type { EmailAttachment } from "@/utils/emailFormatting"
import { createDataUrl } from "@/utils/imageAssetHandler"

interface OriginalEmailDialogProps {
  /** The untouched, un-cleaned message body as it arrived */
  content: string
  isHTML: boolean
  subject?: string
  /** Attachments of the message, used to resolve inline `cid:` images */
  attachments?: EmailAttachment[]
}

const normalizeCid = (value: string) => value.replace(/[<>]/g, "").trim().toLowerCase()

/**
 * Renders the original email exactly as the sender wrote it, inside a
 * sandboxed iframe so remote images, inline styles and scripts behave the way
 * they would in a real mail client — without any access to this app (the
 * sandbox intentionally omits `allow-same-origin`, so the frame runs in an
 * opaque origin with no access to our cookies, storage or DOM).
 *
 * Inline `cid:` images are resolved to `data:` URLs before rendering, since a
 * sandboxed frame cannot load `blob:` URLs from this origin.
 */
export const OriginalEmailDialog: React.FC<OriginalEmailDialogProps> = ({
  content,
  isHTML,
  subject,
  attachments = [],
}) => {
  const [open, setOpen] = useState(false)
  const [cidMap, setCidMap] = useState<Record<string, string>>({})
  const [resolving, setResolving] = useState(false)

  const inlineAttachments = useMemo(
    () => attachments.filter((a) => a.contentId || a.filename),
    [attachments],
  )

  // Resolve inline attachments to data URLs once the dialog opens
  useEffect(() => {
    if (!open || !isHTML || inlineAttachments.length === 0) return
    let cancelled = false

    const referenced = new Set(
      Array.from(content.matchAll(/cid:([^"'\s>)]+)/gi)).map((m) => normalizeCid(m[1])),
    )
    if (referenced.size === 0) return

    const matching = inlineAttachments.filter((a) => {
      const byCid = a.contentId ? referenced.has(normalizeCid(a.contentId)) : false
      const byName = a.filename ? referenced.has(normalizeCid(a.filename)) : false
      return byCid || byName
    })
    if (matching.length === 0) return

    setResolving(true)
    Promise.all(
      matching.map(async (a) => {
        const url = await createDataUrl(a)
        return url ? { keys: [a.contentId, a.filename].filter(Boolean) as string[], url } : null
      }),
    ).then((results) => {
      if (cancelled) return
      const map: Record<string, string> = {}
      for (const result of results) {
        if (!result) continue
        for (const key of result.keys) map[normalizeCid(key)] = result.url
      }
      setCidMap(map)
      setResolving(false)
    })

    return () => {
      cancelled = true
    }
  }, [open, isHTML, content, inlineAttachments])

  const unresolvedCids = useMemo(() => {
    if (!isHTML) return 0
    const referenced = new Set(
      Array.from(content.matchAll(/cid:([^"'\s>)]+)/gi)).map((m) => normalizeCid(m[1])),
    )
    let missing = 0
    referenced.forEach((cid) => {
      if (!cidMap[cid]) missing++
    })
    return missing
  }, [content, cidMap, isHTML])

  const srcDoc = useMemo(() => {
    if (!open) return ""
    const resolved = isHTML
      ? content.replace(/cid:([^"'\s>)]+)/gi, (match, cid) => cidMap[normalizeCid(cid)] || match)
      : content

    const body = isHTML
      ? resolved
      : `<pre style="white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px">${content
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")}</pre>`

    return `<!doctype html><html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<base target="_blank" />
<style>
  html,body{margin:0;padding:16px;background:#fff;color:#111;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5}
  img{max-width:100%;height:auto}
  table{max-width:100%}
</style></head><body>${body}</body></html>`
  }, [open, content, isHTML, cidMap])


  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
          aria-label="View original email"
        >
          <Code2 className="h-3 w-3 mr-1" aria-hidden="true" />
          View original
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-2">
          <DialogTitle className="text-base">
            {subject ? `Original email — ${subject}` : "Original email"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Rendered exactly as received, including images and styles. Runs isolated from this app;
            links open in a new tab.
          </DialogDescription>
        </DialogHeader>
        <div className="px-4 pb-4">
          <iframe
            title="Original email"
            srcDoc={srcDoc}
            sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer"
            className="w-full h-[65vh] rounded-md border bg-white"
          />
          <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
            {resolving
              ? "Loading inline (cid:) attachment images…"
              : unresolvedCids > 0
                ? `${unresolvedCids} inline (cid:) image${unresolvedCids === 1 ? "" : "s"} could not be resolved — see the attachment list.`
                : "Inline (cid:) attachment images are embedded; links open in a new tab."}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  )
}

export default OriginalEmailDialog
