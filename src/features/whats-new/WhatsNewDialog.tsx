import { Sparkles, X } from "lucide-react"
import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useWhatsNew } from "./useWhatsNew"

/**
 * Shows unseen feature announcements once per user, on app open.
 */
export const WhatsNewDialog: React.FC = () => {
  const { unseen, dismiss, ready } = useWhatsNew()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (ready && unseen.length > 0) setOpen(true)
  }, [ready, unseen.length])

  const close = () => {
    dismiss(unseen.map((a) => a.id))
    setOpen(false)
  }

  if (unseen.length === 0) return null

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogContent className="flex max-h-[85svh] w-[calc(100vw-1.5rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg [&>button]:hidden">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={close}
          aria-label="Dismiss what's new"
          className="absolute right-2 top-2 z-10 h-10 w-10 rounded-full text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </Button>
        <DialogHeader className="shrink-0 space-y-1.5 border-b p-4 pr-12 text-left sm:p-6 sm:pr-12">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">New in Support Hub</span>
          </div>
          <DialogTitle>What&apos;s new</DialogTitle>
          <DialogDescription>A quick look at what changed since your last visit.</DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-6">
          {unseen.map((item) => {
            const Icon = item.icon
            return (
              <div key={item.id} className="rounded-lg border bg-muted/30 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-md bg-primary/10 p-2 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium leading-none">{item.title}</h3>
                      {item.shortcut && (
                        <span className="flex items-center gap-1">
                          {item.shortcut.map((key) => (
                            <kbd
                              key={key}
                              className="rounded border bg-background px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground"
                            >
                              {key}
                            </kbd>
                          ))}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                    {item.bullets && (
                      <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
                        {item.bullets.map((b) => (
                          <li key={b}>{b}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <DialogFooter className="shrink-0 gap-2 border-t bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-6">
          <Button onClick={close} className="h-11 w-full text-base sm:h-10 sm:w-auto sm:text-sm">
            Got it
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
