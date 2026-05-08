import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useSendRecruitmentSms, useApplicantSmsMessages } from '@/hooks/recruitment/useRecruitmentSms';
import { useDateFormatting } from '@/hooks/useDateFormatting';
import { calculateSegments } from '@/utils/smsUtils';
import { cn } from '@/lib/utils';

interface Props {
  conversationId: string;
  applicantId: string;
  inboxId: string | null;
}

const STATUS_BADGE: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  queued: { label: 'I kø', variant: 'secondary' },
  sending: { label: 'Sender', variant: 'secondary' },
  sent: { label: 'Sendt', variant: 'outline' },
  delivered: { label: 'Levert', variant: 'default' },
  failed: { label: 'Feilet', variant: 'destructive' },
  undelivered: { label: 'Ikke levert', variant: 'destructive' },
};

export const InlineSmsThread: React.FC<Props> = ({ conversationId, applicantId, inboxId }) => {
  const { data: messages, isLoading, refetch } = useApplicantSmsMessages(conversationId);
  const sendMut = useSendRecruitmentSms();
  const { dateTime } = useDateFormatting();
  const [body, setBody] = useState('');
  const seg = calculateSegments(body);

  const onSend = async () => {
    if (!body.trim()) return;
    if (!inboxId) {
      toast.error('Mangler innboks for SMS');
      return;
    }
    try {
      await sendMut.mutateAsync({
        conversation_id: conversationId,
        applicant_id: applicantId,
        inbox_id: inboxId,
        body: body.trim(),
      });
      setBody('');
      toast.success('SMS sendt');
      refetch();
    } catch (e: any) {
      toast.error(e?.message || 'Kunne ikke sende SMS');
    }
  };

  return (
    <div className="border-t bg-muted/20 px-4 py-3 space-y-3">
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Laster meldinger…</div>
      ) : (messages?.length ?? 0) === 0 ? (
        <div className="text-sm text-muted-foreground py-4 text-center">Ingen meldinger ennå.</div>
      ) : (
        <ul className="space-y-2 max-h-96 overflow-y-auto pr-1">
          {messages!.map((m) => {
            const isAgent = m.sender_type === 'agent';
            const statusInfo = m.sms_status ? STATUS_BADGE[m.sms_status] : null;
            return (
              <li key={m.id} className={cn('flex', isAgent ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[75%] rounded-lg px-3 py-2 text-sm space-y-1',
                    isAgent ? 'bg-primary text-primary-foreground' : 'bg-background border'
                  )}
                >
                  <div className="whitespace-pre-wrap break-words">{m.content}</div>
                  <div
                    className={cn(
                      'flex items-center gap-2 text-[10px]',
                      isAgent ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    )}
                  >
                    <span>{dateTime(m.created_at)}</span>
                    {isAgent && statusInfo && (
                      <Badge variant={statusInfo.variant} className="text-[9px] px-1 py-0 h-4">
                        {statusInfo.label}
                      </Badge>
                    )}
                    {m.sms_segments && m.sms_segments > 1 && (
                      <span>· {m.sms_segments} deler</span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="space-y-2">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Skriv SMS-svar…"
          rows={3}
          className="resize-none text-sm"
          disabled={sendMut.isPending}
        />
        <div className="flex items-center justify-between">
          <div className="text-[11px] text-muted-foreground">
            {seg.length} tegn · {seg.segments || 0} {seg.segments === 1 ? 'segment' : 'segmenter'} · {seg.encoding}
          </div>
          <Button size="sm" onClick={onSend} disabled={!body.trim() || sendMut.isPending || !inboxId}>
            {sendMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            Send SMS
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InlineSmsThread;
