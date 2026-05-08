import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Plus, X, Clock, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  useApplicantSmsConversations,
  useApplicantScheduledSms,
  useCancelScheduledSms,
} from '@/hooks/recruitment/useRecruitmentSms';
import { ComposeRecruitmentSmsDialog } from './ComposeRecruitmentSmsDialog';
import { InlineSmsThread } from './InlineSmsThread';
import { useDateFormatting } from '@/hooks/useDateFormatting';

interface Props {
  applicant: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    phone?: string | null;
  };
}

export const ApplicantSmsTab: React.FC<Props> = ({ applicant }) => {
  const [composeOpen, setComposeOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data: conversations, isLoading } = useApplicantSmsConversations(applicant.id);
  const { data: scheduled } = useApplicantScheduledSms(applicant.id);
  const cancelMut = useCancelScheduledSms();
  const { dateTime } = useDateFormatting();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {applicant.phone ? `Telefon: ${applicant.phone}` : 'Ingen telefon registrert'}
        </div>
        <Button size="sm" onClick={() => setComposeOpen(true)} disabled={!applicant.phone}>
          <Plus className="h-3.5 w-3.5" />
          Ny SMS
        </Button>
      </div>

      {(scheduled?.length ?? 0) > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="text-sm font-medium flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Planlagte SMS
            </div>
            <ul className="divide-y">
              {scheduled!.map((s) => (
                <li key={s.id} className="py-2 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{s.body}</div>
                    <div className="text-xs text-muted-foreground">
                      Til {s.to_phone} • {dateTime(s.scheduled_for)} • {s.status}
                    </div>
                    {s.error_message && (
                      <div className="text-xs text-destructive mt-0.5">{s.error_message}</div>
                    )}
                  </div>
                  {s.status === 'pending' && (
                    <Button size="sm" variant="ghost" onClick={() => cancelMut.mutate({ id: s.id })}>
                      <X className="h-3.5 w-3.5" /> Avbryt
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 text-sm text-muted-foreground">Laster…</div>
          ) : (conversations?.length ?? 0) === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              <MessageSquare className="h-6 w-6 mx-auto mb-2 opacity-50" />
              Ingen SMS-samtaler ennå.
            </div>
          ) : (
            <ul className="divide-y">
              {conversations!.map((c) => {
                const isExpanded = expandedId === c.id;
                return (
                  <li key={c.id} className="bg-background">
                    <div
                      className={cn(
                        'flex items-center gap-3 p-3 hover:bg-muted/40 cursor-pointer transition-colors',
                        isExpanded && 'bg-muted/30'
                      )}
                      onClick={() => setExpandedId(isExpanded ? null : c.id)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm line-clamp-2 break-words">
                          {c.preview_text || '—'}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {dateTime(c.updated_at)} • {c.status}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {c.last_message_sender_type || 'agent'}
                      </Badge>
                      <Link
                        to={`/interactions/text/conversations/${c.id}`}
                        onClick={(e) => e.stopPropagation()}
                        title="Åpne i fullvisning"
                      >
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </Link>
                    </div>
                    {isExpanded && (
                      <InlineSmsThread
                        conversationId={c.id}
                        applicantId={applicant.id}
                        inboxId={c.inbox_id}
                      />
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <ComposeRecruitmentSmsDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        applicant={applicant}
      />
    </div>
  );
};

export default ApplicantSmsTab;
