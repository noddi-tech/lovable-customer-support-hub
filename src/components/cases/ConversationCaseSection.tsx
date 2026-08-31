import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CaseStatusBadge, CasePriorityBadge, CaseSlaBadge } from '@/components/cases/CaseBadges';
import { CreateCaseDialog } from '@/components/cases/CreateCaseDialog';
import {
  useCases,
  useConversationCase,
  useLinkConversationToCase,
} from '@/hooks/useCases';
import { Briefcase, ExternalLink, Plus, Unlink } from 'lucide-react';

interface ConversationCaseSectionProps {
  conversationId: string;
  caseId?: string | null;
  customerId?: string | null;
  subject?: string | null;
  inboxId?: string | null;
  channel?: string | null;
}

export function ConversationCaseSection({
  conversationId,
  caseId,
  customerId,
  subject,
  inboxId,
  channel,
}: ConversationCaseSectionProps) {
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);
  const { data: linkedCase } = useConversationCase(conversationId, caseId);
  const { data: candidateCases = [] } = useCases({ view: 'open', customerId: customerId ?? undefined });
  const linkCase = useLinkConversationToCase();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Briefcase className="h-4 w-4" /> Case
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {linkedCase ? (
          <>
            <button
              onClick={() => navigate(`/operations/cases/${linkedCase.id}`)}
              className="w-full rounded-md border p-2.5 text-left transition-colors hover:bg-accent/50"
            >
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">#{linkedCase.case_number}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{linkedCase.title}</span>
                <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <CaseStatusBadge status={linkedCase.status} />
                <CasePriorityBadge priority={linkedCase.priority} />
                <CaseSlaBadge record={linkedCase} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Owner: {linkedCase.owner?.full_name ?? 'Unassigned'}
              </p>
            </button>
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => linkCase.mutate({ conversationId, caseId: null })}
            >
              <Unlink className="mr-1.5 h-3.5 w-3.5" /> Unlink case
            </Button>
          </>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Link this conversation to a case so follow-up survives beyond this thread.
            </p>
            {candidateCases.length > 0 && (
              <Select onValueChange={(value) => linkCase.mutate({ conversationId, caseId: value })}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Link to existing case" />
                </SelectTrigger>
                <SelectContent>
                  {candidateCases.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      #{c.case_number} · {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <Button size="sm" variant="outline" className="w-full" onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Create case
            </Button>
          </>
        )}
      </CardContent>

      <CreateCaseDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        defaultTitle={subject ?? ''}
        customerId={customerId ?? null}
        conversationId={conversationId}
        inboxId={inboxId ?? null}
        sourceChannel={channel ?? null}
      />
    </Card>
  );
}
