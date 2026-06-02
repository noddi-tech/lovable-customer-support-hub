import React from 'react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import {
  Check, Clock, FileText, Mail, MessageSquare, Send, Sparkles, X, Copy,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  useCandidateFormTokens,
  useRevokeCandidateForm,
  deriveStatus,
  type CandidateFormTokenRow,
  type FormTokenStatus,
} from '@/hooks/recruitment/useCandidateFormTokens';
import { toast } from 'sonner';

interface Props {
  applicantId: string;
  /** Whether to surface the "send new form" button in the header. */
  onSendForm?: () => void;
  canSend?: boolean;
}

const STATUS_META: Record<FormTokenStatus, { label: string; classes: string; icon: React.ReactNode }> = {
  sent: {
    label: 'Sendt, ikke åpnet',
    classes: 'bg-blue-50 text-blue-700 border-blue-200',
    icon: <Send className="h-3 w-3" />,
  },
  opened: {
    label: 'Åpnet',
    classes: 'bg-amber-50 text-amber-700 border-amber-200',
    icon: <FileText className="h-3 w-3" />,
  },
  submitted: {
    label: 'Innsendt',
    classes: 'bg-green-50 text-green-700 border-green-200',
    icon: <Check className="h-3 w-3" />,
  },
  expired: {
    label: 'Utløpt',
    classes: 'bg-muted text-muted-foreground border-border',
    icon: <Clock className="h-3 w-3" />,
  },
  revoked: {
    label: 'Trukket tilbake',
    classes: 'bg-muted text-muted-foreground border-border line-through',
    icon: <X className="h-3 w-3" />,
  },
};

function fmt(d: string | null | undefined): string {
  if (!d) return '';
  return format(new Date(d), "d. MMM HH:mm", { locale: nb });
}

function TokenRowCard({ token, onRevoke }: { token: CandidateFormTokenRow; onRevoke: (id: string) => void }) {
  const status = deriveStatus(token);
  const meta = STATUS_META[status];
  const isLive = status === 'sent' || status === 'opened';
  const publicUrl = `${window.location.origin}/apply/form/${token.token}`;

  // Source: "Ola Nordmann" or "Automatisering: Forhåndsscreening-flyt" or "System"
  const sourceLabel = token.created_by
    ? token.creator_name ?? 'Ukjent bruker'
    : token.triggered_by_rule_name
    ? `Automatisering: ${token.triggered_by_rule_name}`
    : 'Automatisering';

  const channelIcon =
    token.channel === 'sms' ? <MessageSquare className="h-3 w-3" /> :
    token.channel === 'email' ? <Mail className="h-3 w-3" /> :
    <FileText className="h-3 w-3" />;
  const channelLabel =
    token.channel === 'sms' ? 'SMS' :
    token.channel === 'email' ? 'E-post' :
    'Manuell';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      toast.success('Lenke kopiert');
    } catch {
      toast.error('Kunne ikke kopiere');
    }
  };

  return (
    <li className="px-4 py-3 space-y-1.5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={`text-[10px] h-5 ${meta.classes}`}>
            <span className="inline-flex items-center gap-1">{meta.icon}{meta.label}</span>
          </Badge>
          <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
            {channelIcon} {channelLabel}
          </span>
        </div>
        <div className="text-xs text-muted-foreground">{fmt(token.created_at)}</div>
      </div>
      <div className="text-xs text-muted-foreground">
        Sendt av {sourceLabel}
        {status === 'submitted' && token.used_at && <> · Innsendt {fmt(token.used_at)}</>}
        {status === 'opened' && token.opened_at && <> · Åpnet {fmt(token.opened_at)}</>}
        {status === 'revoked' && token.revoked_at && <> · {fmt(token.revoked_at)}</>}
        {(status === 'sent' || status === 'opened') && <> · Utløper {fmt(token.expires_at)}</>}
        {(status === 'sent' || status === 'opened') && (
          <> · {token.attempts} av 5 forsøk brukt</>
        )}
      </div>
      {isLive && (
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs bg-muted/40 border rounded px-2 py-1 max-w-full min-w-0">
            <span className="truncate text-muted-foreground font-mono text-[11px]">{publicUrl}</span>
            <button
              type="button"
              onClick={handleCopy}
              className="text-foreground hover:text-primary inline-flex items-center"
              title="Kopier lenke"
            >
              <Copy className="h-3 w-3" />
            </button>
          </div>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs text-destructive hover:text-destructive"
            onClick={() => onRevoke(token.id)}
          >
            Trekk tilbake
          </Button>
        </div>
      )}
      {isLive && (
        <p className="text-[11px] text-muted-foreground italic">
          Lenken gir tilgang til søkerens data — del trygt.
        </p>
      )}
    </li>
  );
}

const CandidateFormHistorySection: React.FC<Props> = ({ applicantId, onSendForm, canSend }) => {
  const { data: tokens, isLoading } = useCandidateFormTokens(applicantId);
  const revoke = useRevokeCandidateForm();

  const handleRevoke = (tokenId: string) => {
    revoke.mutate({ token_id: tokenId, applicant_id: applicantId });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          Kandidatskjema
        </CardTitle>
        {onSendForm && (
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" onClick={onSendForm} disabled={!canSend}>
                  <Send className="h-3.5 w-3.5" />
                  Send skjema
                </Button>
              </TooltipTrigger>
              <TooltipContent>Be kandidaten fylle ut manglende informasjon via skjema</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="px-4 py-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ) : !tokens || tokens.length === 0 ? (
          <p className="px-4 py-3 text-xs text-muted-foreground">
            Ingen skjemaer sendt ennå.
          </p>
        ) : (
          <ul className="divide-y">
            {tokens.map((t) => (
              <TokenRowCard key={t.id} token={t} onRevoke={handleRevoke} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default CandidateFormHistorySection;
