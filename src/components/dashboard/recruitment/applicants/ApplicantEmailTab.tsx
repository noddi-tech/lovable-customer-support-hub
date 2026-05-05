import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Mail, Plus, Link2, X, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  useApplicantConversations,
  useApplicantScheduledEmails,
  useDetachConversationFromApplicant,
  useCancelScheduledEmail,
} from '@/hooks/recruitment/useRecruitmentEmail';
import { ComposeRecruitmentEmailDialog } from './ComposeRecruitmentEmailDialog';
import { AttachToApplicantDialog } from './AttachToApplicantDialog';
import { useDateFormatting } from '@/hooks/useDateFormatting';

interface Props {
  applicant: {
    id: string;
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  };
}

export const ApplicantEmailTab: React.FC<Props> = ({ applicant }) => {
  const [composeOpen, setComposeOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const { data: conversations, isLoading } = useApplicantConversations(applicant.id);
  const { data: scheduled } = useApplicantScheduledEmails(applicant.id);
  const detachMut = useDetachConversationFromApplicant();
  const cancelMut = useCancelScheduledEmail();
  const { dateTime } = useDateFormatting();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setAttachOpen(true)}>
          <Link2 className="h-3.5 w-3.5" />
          Knytt eksisterende samtale
        </Button>
        <Button size="sm" onClick={() => setComposeOpen(true)}>
          <Plus className="h-3.5 w-3.5" />
          Ny e-post
        </Button>
      </div>

      {(scheduled?.length ?? 0) > 0 && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <div className="text-sm font-medium flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> Planlagte e-poster
            </div>
            <ul className="divide-y">
              {scheduled!.map((s) => (
                <li key={s.id} className="py-2 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.subject}</div>
                    <div className="text-xs text-muted-foreground">
                      Til {s.to_email} • {dateTime(s.scheduled_for)} • {s.status}
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
              <Mail className="h-6 w-6 mx-auto mb-2 opacity-50" />
              Ingen e-postsamtaler ennå.
            </div>
          ) : (
            <ul className="divide-y">
              {conversations!.map((c) => (
                <li key={c.id} className="p-3 hover:bg-muted/40 flex items-center gap-3">
                  <Link
                    to={`/conversations/${c.id}`}
                    className="flex-1 min-w-0"
                  >
                    <div className="text-sm font-medium truncate">
                      {c.subject || '(uten emne)'}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {c.preview_text || ''}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {dateTime(c.updated_at)} • {c.status}
                    </div>
                  </Link>
                  <Badge variant="outline" className="text-[10px]">
                    {c.last_message_sender_type || 'agent'}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => detachMut.mutate({ conversation_id: c.id })}
                    title="Frakoble denne samtalen"
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ComposeRecruitmentEmailDialog
        open={composeOpen}
        onOpenChange={setComposeOpen}
        applicant={applicant}
      />
      <AttachToApplicantDialog
        open={attachOpen}
        onOpenChange={setAttachOpen}
        applicantId={applicant.id}
      />
    </div>
  );
};

export default ApplicantEmailTab;
