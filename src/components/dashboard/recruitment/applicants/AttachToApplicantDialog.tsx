import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import { useAttachConversationToApplicant } from '@/hooks/recruitment/useRecruitmentEmail';
import { useDateFormatting } from '@/hooks/useDateFormatting';

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  applicantId: string;
}

export const AttachToApplicantDialog: React.FC<Props> = ({ open, onOpenChange, applicantId }) => {
  const [query, setQuery] = useState('');
  const { currentOrganizationId } = useOrganizationStore();
  const attachMut = useAttachConversationToApplicant();
  const { dateTime } = useDateFormatting();

  const { data: results, isFetching } = useQuery({
    queryKey: ['attach-search-conversations', currentOrganizationId, query],
    enabled: open && !!currentOrganizationId && query.trim().length >= 2,
    refetchOnMount: 'always',
    queryFn: async () => {
      const q = query.trim();
      const { data, error } = await supabase
        .from('conversations')
        .select('id, subject, updated_at, applicant_id, customer:customers(email, full_name)')
        .eq('organization_id', currentOrganizationId!)
        .is('deleted_at', null)
        .or(`subject.ilike.%${q}%`)
        .order('updated_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const handleAttach = async (conversationId: string) => {
    await attachMut.mutateAsync({ conversation_id: conversationId, applicant_id: applicantId });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Knytt eksisterende samtale</DialogTitle>
          <DialogDescription>
            Søk etter en samtale (etter emne) og knytt den til denne søkeren.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Søk etter emne…"
              className="pl-8"
            />
          </div>

          <div className="max-h-72 overflow-y-auto border rounded-md divide-y">
            {isFetching && (
              <div className="p-4 text-sm text-muted-foreground flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Søker…
              </div>
            )}
            {!isFetching && (results?.length ?? 0) === 0 && query.trim().length >= 2 && (
              <div className="p-4 text-sm text-muted-foreground">Ingen treff</div>
            )}
            {(results ?? []).map((c: any) => (
              <div key={c.id} className="p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{c.subject || '(uten emne)'}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {c.customer?.email || ''} • {dateTime(c.updated_at)}
                  </div>
                  {c.applicant_id && c.applicant_id !== applicantId && (
                    <div className="text-[11px] text-warning">
                      Allerede knyttet til en annen søker — vil bli flyttet.
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={() => handleAttach(c.id)}
                  disabled={attachMut.isPending}
                >
                  Knytt
                </Button>
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Lukk</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AttachToApplicantDialog;
