import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MessageItem } from '@/components/conversations/MessageItem';
import { useApplicantConversationMessages } from '@/hooks/recruitment/useRecruitmentEmail';
import { InlineReplyBox } from './InlineReplyBox';

interface Props {
  conversationId: string;
  applicantId: string;
  inboxId: string | null;
  applicant: {
    first_name?: string | null;
    last_name?: string | null;
    email?: string | null;
  };
  subjectHint?: string | null;
}

export const InlineEmailThread: React.FC<Props> = ({
  conversationId,
  applicantId,
  inboxId,
  applicant,
  subjectHint,
}) => {
  const { data: messages, isLoading, error } = useApplicantConversationMessages(conversationId);

  const customerForItem = {
    customer: {
      full_name: [applicant.first_name, applicant.last_name].filter(Boolean).join(' ').trim() || undefined,
      email: applicant.email || undefined,
    },
  };

  return (
    <div className="border-t border-border bg-background">
      <div className="p-3 space-y-3 max-h-[600px] overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Laster meldinger…
          </div>
        )}
        {error && (
          <div className="text-sm text-destructive py-4 text-center">
            Kunne ikke laste meldinger.
          </div>
        )}
        {!isLoading && !error && (messages?.length ?? 0) === 0 && (
          <div className="text-sm text-muted-foreground py-4 text-center">
            Ingen meldinger ennå.
          </div>
        )}
        {messages?.map((msg) => {
          const isAgent = msg.authorType === 'agent' || msg.authorType === 'ai_draft';
          return (
            <div
              key={msg.dedupKey || msg.id}
              className={cn('flex w-full', isAgent ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[85%] min-w-0',
                  isAgent && '[&_>div]:bg-primary/5 [&_>div]:border-primary/20'
                )}
              >
                <MessageItem message={msg} conversation={customerForItem} />
              </div>
            </div>
          );
        })}
      </div>
      {inboxId && (
        <InlineReplyBox
          conversationId={conversationId}
          applicantId={applicantId}
          inboxId={inboxId}
          subjectHint={subjectHint}
        />
      )}
      {!inboxId && (
        <div className="border-t border-border bg-muted/30 p-3 text-xs text-muted-foreground text-center">
          Innboks mangler — kan ikke svare inline.
        </div>
      )}
    </div>
  );
};

export default InlineEmailThread;
