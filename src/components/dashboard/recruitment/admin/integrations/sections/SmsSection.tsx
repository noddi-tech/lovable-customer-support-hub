import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { MessageSquare, Loader2, Save, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';

interface InboxRow {
  id: string;
  name: string;
  sms_enabled: boolean | null;
  sms_provider: string | null;
  sms_provider_phone_number: string | null;
}

const SUPABASE_PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const INBOUND_WEBHOOK_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/sms-inbound/messente`;
const STATUS_WEBHOOK_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/sms-status-callback/messente`;

export function SmsSection() {
  const { currentOrganizationId } = useOrganizationStore();
  const qc = useQueryClient();

  const { data: inboxes, isLoading } = useQuery({
    queryKey: ['recruitment-inboxes-sms-admin', currentOrganizationId],
    enabled: !!currentOrganizationId,
    refetchOnMount: 'always',
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inboxes')
        .select('id, name, sms_enabled, sms_provider, sms_provider_phone_number')
        .eq('organization_id', currentOrganizationId!)
        .eq('purpose', 'recruitment')
        .eq('is_active', true)
        .order('name');
      if (error) throw error;
      return (data ?? []) as InboxRow[];
    },
  });

  const updateMut = useMutation({
    mutationFn: async (input: {
      id: string;
      sms_enabled: boolean;
      sms_provider: string | null;
      sms_provider_phone_number: string | null;
    }) => {
      const { error } = await supabase
        .from('inboxes')
        .update({
          sms_enabled: input.sms_enabled,
          sms_provider: input.sms_provider,
          sms_provider_phone_number: input.sms_provider_phone_number,
        })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recruitment-inboxes-sms-admin'] });
      qc.invalidateQueries({ queryKey: ['recruitment-sms-inboxes'] });
      toast.success('SMS-konfigurasjon lagret');
    },
    onError: (e: any) => toast.error(e?.message || 'Kunne ikke lagre'),
  });

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          SMS
        </h3>
        <p className="text-xs text-muted-foreground">
          Konfigurer SMS-leverandør per rekrutteringsinnboks. Webhook-URLer nedenfor må registreres i leverandørens kontrollpanel.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Webhook-URLer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div>
            <div className="text-muted-foreground mb-1">Innkommende SMS (Messente)</div>
            <code className="block bg-muted px-2 py-1 rounded break-all">{INBOUND_WEBHOOK_URL}</code>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">Leveringsstatus (DLR)</div>
            <code className="block bg-muted px-2 py-1 rounded break-all">{STATUS_WEBHOOK_URL}</code>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Laster innbokser…</div>
      ) : (inboxes?.length ?? 0) === 0 ? (
        <div className="text-sm text-muted-foreground">Ingen rekrutteringsinnbokser funnet.</div>
      ) : (
        <div className="space-y-3">
          {inboxes!.map((ibox) => (
            <InboxSmsCard
              key={ibox.id}
              inbox={ibox}
              onSave={(payload) => updateMut.mutate({ id: ibox.id, ...payload })}
              isSaving={updateMut.isPending}
            />
          ))}
        </div>
      )}
    </section>
  );
}

interface InboxCardProps {
  inbox: InboxRow;
  onSave: (input: {
    sms_enabled: boolean;
    sms_provider: string | null;
    sms_provider_phone_number: string | null;
  }) => void;
  isSaving: boolean;
}

function InboxSmsCard({ inbox, onSave, isSaving }: InboxCardProps) {
  const [enabled, setEnabled] = useState(!!inbox.sms_enabled);
  const [provider, setProvider] = useState<string>(inbox.sms_provider || 'messente');
  const [sender, setSender] = useState(inbox.sms_provider_phone_number || '');

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-sm">{inbox.name}</CardTitle>
          {inbox.sms_enabled ? (
            <Badge variant="default">SMS aktivert</Badge>
          ) : (
            <Badge variant="outline">SMS av</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2">
          <Switch checked={enabled} onCheckedChange={setEnabled} />
          <Label className="text-sm">Aktiver SMS for denne innboksen</Label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Leverandør</Label>
            <Select value={provider} onValueChange={setProvider} disabled={!enabled}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="messente">Messente</SelectItem>
                <SelectItem value="twilio" disabled>Twilio (kommer)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Avsender (E.164 eller alfanumerisk, maks 11 tegn)</Label>
            <Input
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              placeholder="+4712345678 eller Noddi"
              disabled={!enabled}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => onSave({
              sms_enabled: enabled,
              sms_provider: enabled ? provider : null,
              sms_provider_phone_number: enabled ? sender.trim() || null : null,
            })}
            disabled={isSaving || (enabled && !sender.trim())}
          >
            {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Lagre
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
