import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { useWhatsNew } from './useWhatsNew';

/**
 * Shows unseen feature announcements once per user, on app open.
 */
export const WhatsNewDialog: React.FC = () => {
  const { unseen, dismiss, ready } = useWhatsNew();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (ready && unseen.length > 0) setOpen(true);
  }, [ready, unseen.length]);

  const close = () => {
    dismiss(unseen.map((a) => a.id));
    setOpen(false);
  };

  if (unseen.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-4 w-4" />
            <span className="text-xs font-medium uppercase tracking-wide">New in Support Hub</span>
          </div>
          <DialogTitle>What&apos;s new</DialogTitle>
          <DialogDescription>
            A quick look at what changed since your last visit.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {unseen.map((item) => {
            const Icon = item.icon;
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
            );
          })}
        </div>

        <DialogFooter>
          <Button onClick={close}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
