import React, { useMemo, useState } from 'react';
import { Code2, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface OriginalEmailDialogProps {
  /** The untouched, un-cleaned message body as it arrived */
  content: string;
  isHTML: boolean;
  subject?: string;
}

/**
 * Renders the original email exactly as the sender wrote it, inside a
 * sandboxed iframe so remote images, inline styles and scripts behave the way
 * they would in a real mail client — without any access to this app (the
 * sandbox intentionally omits `allow-same-origin`, so the frame runs in an
 * opaque origin with no access to our cookies, storage or DOM).
 */
export const OriginalEmailDialog: React.FC<OriginalEmailDialogProps> = ({
  content,
  isHTML,
  subject,
}) => {
  const [open, setOpen] = useState(false);

  const srcDoc = useMemo(() => {
    if (!open) return '';
    const body = isHTML
      ? content
      : `<pre style="white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px">${content
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')}</pre>`;

    return `<!doctype html><html><head><meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<base target="_blank" />
<style>
  html,body{margin:0;padding:16px;background:#fff;color:#111;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.5}
  img{max-width:100%;height:auto}
  table{max-width:100%}
</style></head><body>${body}</body></html>`;
  }, [open, content, isHTML]);

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
            {subject ? `Original email — ${subject}` : 'Original email'}
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
            Inline (cid:) attachment images may not appear here — see the attachment list.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OriginalEmailDialog;
