import React, { useEffect, useState } from 'react';
import { Loader2, Mail, Webhook, MessageSquare, UserCheck, ListTodo } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { MatchedRule, PendingMove } from './useStageMoveAutomation';

interface Props {
  pendingMove: PendingMove | null;
  isSending: boolean;
  isSkipping: boolean;
  onConfirmSend: () => void;
  onConfirmSkip: (skipReason?: string) => void;
  onCancel: () => void;
}

function actionIcon(actionType: string) {
  switch (actionType) {
    case 'send_email':
      return <Mail className="h-4 w-4 text-muted-foreground" aria-hidden />;
    case 'webhook':
      return <Webhook className="h-4 w-4 text-muted-foreground" aria-hidden />;
    case 'send_sms':
      return <MessageSquare className="h-4 w-4 text-muted-foreground" aria-hidden />;
    case 'assign_to':
      return <UserCheck className="h-4 w-4 text-muted-foreground" aria-hidden />;
    case 'create_task':
      return <ListTodo className="h-4 w-4 text-muted-foreground" aria-hidden />;
    default:
      return null;
  }
}

function describeAction(rule: MatchedRule): string {
  const cfg = rule.action_config ?? {};
  switch (rule.action_type) {
    case 'send_email': {
      const tpl = (cfg as any).template_name ?? (cfg as any).template_id;
      return tpl ? `Send e-post: '${tpl}'` : 'Send e-post';
    }
    case 'webhook': {
      const url = (cfg as any).url as string | undefined;
      try {
        return url ? `Webhook → ${new URL(url).hostname}` : 'Webhook';
      } catch {
        return 'Webhook';
      }
    }
    case 'send_sms':
      return 'Send SMS';
    case 'assign_to': {
      const name = (cfg as any).user_name ?? (cfg as any).user_id;
      return name ? `Tildel til ${name}` : 'Tildel ansvarlig';
    }
    case 'create_task':
      return 'Opprett oppgave';
    default:
      return rule.action_type;
  }
}

const RuleRow: React.FC<{ rule: MatchedRule }> = ({ rule }) => (
  <li className="flex items-start gap-2 rounded-md border bg-card px-3 py-2 text-sm">
    <span className="mt-0.5">{actionIcon(rule.action_type)}</span>
    <span className="flex-1 break-words">
      <span className="font-medium">{rule.rule_name}</span>
      <span className="text-muted-foreground"> — {describeAction(rule)}</span>
    </span>
  </li>
);

const StageMoveConfirmDialog: React.FC<Props> = ({
  pendingMove,
  isSending,
  isSkipping,
  onConfirmSend,
  onConfirmSkip,
  onCancel,
}) => {
  const [skipReason, setSkipReason] = useState('');

  // Reset textarea whenever a new pending move opens.
  useEffect(() => {
    if (pendingMove) setSkipReason('');
  }, [pendingMove?.applicationId, pendingMove?.toStageId]);

  const open = pendingMove !== null;
  const busy = isSending || isSkipping;

  const handleOpenChange = (next: boolean) => {
    if (!next && !busy) onCancel();
  };

  if (!pendingMove) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Flytt {pendingMove.applicantName || 'søker'} til {pendingMove.stageName}?
          </DialogTitle>
          <DialogDescription>
            Følgende ekstern kommunikasjon vil sendes til søkeren hvis du bekrefter.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <section className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ekstern kommunikasjon
            </h3>
            <ul className="space-y-2">
              {pendingMove.externalRules.map((r) => (
                <RuleRow key={r.rule_id} rule={r} />
              ))}
            </ul>
          </section>

          {pendingMove.internalRules.length > 0 ? (
            <>
              <Separator />
              <section className="space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  I tillegg kjører følgende uansett
                </h3>
                <ul className="space-y-2">
                  {pendingMove.internalRules.map((r) => (
                    <RuleRow key={r.rule_id} rule={r} />
                  ))}
                </ul>
              </section>
            </>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="skip-reason" className="text-xs text-muted-foreground">
              Grunn for å hoppe over (valgfritt — brukes hvis du velger «Flytt uten å sende»)
            </Label>
            <Textarea
              id="skip-reason"
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              placeholder="F.eks. søkeren er allerede informert per telefon"
              rows={2}
              disabled={busy}
            />
          </div>
        </div>

        <DialogFooter className="flex-wrap gap-2 sm:justify-end">
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Avbryt
          </Button>
          <Button
            variant="outline"
            onClick={() => onConfirmSkip(skipReason)}
            disabled={busy}
          >
            {isSkipping && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Flytt uten å sende
          </Button>
          <Button onClick={onConfirmSend} disabled={busy}>
            {isSending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
            Flytt og send
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StageMoveConfirmDialog;
