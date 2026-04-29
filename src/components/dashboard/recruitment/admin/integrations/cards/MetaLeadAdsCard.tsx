import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Facebook, Plus, KeyRound, Trash2, Pencil, ChevronDown, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useOrganizationStore } from '@/stores/organizationStore';
import { useToast } from '@/hooks/use-toast';
import { useFormPositionMappings } from '../hooks/useFormPositionMappings';
import { useMetaIntegration } from '../hooks/useMetaIntegration';
import { useJobPositions } from '@/components/dashboard/recruitment/positions/usePositions';
import { MetaHealthTab } from '../MetaHealthTab';
import type { MetaIntegration } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { nb } from 'date-fns/locale';

interface Props {
  integration: MetaIntegration | null;
  onConnect: () => void;
  onEdit: () => void;
  onReconnect: () => void;
  onRefreshToken: () => void;
}

function statusBadge(status: MetaIntegration['status']) {
  switch (status) {
    case 'configured':
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">
          Klar for kobling
        </Badge>
      );
    case 'connected':
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
          Tilkoblet
        </Badge>
      );
    case 'disconnected':
      return <Badge variant="secondary">Frakoblet</Badge>;
    case 'error':
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
          Feil
        </Badge>
      );
  }
}

function FormMappingsInline({ integrationId }: { integrationId: string }) {
  const { toast } = useToast();
  const { mappings, createMapping, updateMapping, deleteMapping } =
    useFormPositionMappings(integrationId);
  const { data: positions } = useJobPositions();
  const openPositions = (positions ?? []).filter((p) => p.status === 'open');

  const [newFormId, setNewFormId] = useState('');
  const [newFormName, setNewFormName] = useState('');
  const [newPositionId, setNewPositionId] = useState('');

  const handleAdd = async () => {
    if (!newFormId.trim()) {
      toast({ title: 'Form ID er påkrevd', variant: 'destructive' });
      return;
    }
    try {
      await createMapping.mutateAsync({
        form_id: newFormId.trim(),
        form_name: newFormName.trim() || null,
        position_id: newPositionId || null,
      });
      setNewFormId('');
      setNewFormName('');
      setNewPositionId('');
      toast({ title: 'Skjema lagt til' });
    } catch (e: any) {
      toast({ title: 'Kunne ikke legge til', description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Mappinger ({mappings.length})
        </h4>
        {mappings.length === 0 ? (
          <p className="text-sm text-muted-foreground rounded-md border bg-muted/30 px-3 py-4 text-center">
            Ingen skjemaer mappet ennå.
          </p>
        ) : (
          <div className="space-y-2">
            {mappings.map((m) => (
              <div key={m.id} className="rounded-md border p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Form name</Label>
                    <Input
                      value={m.form_name ?? ''}
                      placeholder="(uten navn)"
                      onChange={(e) =>
                        updateMapping.mutate({ id: m.id, form_name: e.target.value || null })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Form ID</Label>
                    <Input value={m.form_id} readOnly className="font-mono text-xs" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Stilling</Label>
                  <Select
                    value={m.position_id ?? ''}
                    onValueChange={(v) =>
                      updateMapping.mutate({ id: m.id, position_id: v || null })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Velg stilling" />
                    </SelectTrigger>
                    <SelectContent>
                      {openPositions.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={m.is_active}
                      onCheckedChange={(v) => updateMapping.mutate({ id: m.id, is_active: v })}
                    />
                    <Label className="text-xs">Aktiv</Label>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Slett
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Slett skjema-mapping?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Innkommende leads fra dette skjemaet vil ikke lenger opprettes som søkere.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Avbryt</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMapping.mutate(m.id)}>
                          Slett
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-md border bg-muted/30 p-3">
        <h4 className="text-sm font-medium">Legg til skjema</h4>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Form name (valgfritt)</Label>
            <Input
              value={newFormName}
              onChange={(e) => setNewFormName(e.target.value)}
              placeholder="Sommer-kampanje 2026"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Form ID</Label>
            <Input
              value={newFormId}
              onChange={(e) => setNewFormId(e.target.value)}
              placeholder="123456789012345"
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Stilling</Label>
          <Select value={newPositionId} onValueChange={setNewPositionId}>
            <SelectTrigger>
              <SelectValue placeholder="Velg stilling" />
            </SelectTrigger>
            <SelectContent>
              {openPositions.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={handleAdd} disabled={createMapping.isPending}>
          <Plus className="h-4 w-4 mr-2" />
          Legg til skjema
        </Button>
      </div>
    </div>
  );
}

export function MetaLeadAdsCard({ integration, onConnect, onEdit, onReconnect, onRefreshToken }: Props) {
  const { currentOrganizationId } = useOrganizationStore();
  const { toast } = useToast();
  const { deleteIntegration } = useMetaIntegration();

  const { data: leadCount } = useQuery({
    queryKey: ['meta-lead-count', currentOrganizationId],
    enabled: !!currentOrganizationId && !!integration,
    staleTime: 30_000,
    refetchOnMount: 'always',
    queryFn: async () => {
      const { count, error } = await supabase
        .from('recruitment_lead_ingestion_log' as any)
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', currentOrganizationId)
        .eq('source', 'meta_lead_ad');
      if (error) throw error;
      return count ?? 0;
    },
  });

  if (!integration) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="rounded-md border bg-blue-500/5 p-2">
                <Facebook className="h-4 w-4 text-blue-600" />
              </div>
              <div className="space-y-1">
                <CardTitle className="text-base">Meta Lead Ads</CardTitle>
                <CardDescription>
                  Motta søkere automatisk fra Facebook og Instagram Lead Ad-kampanjer.
                </CardDescription>
              </div>
            </div>
            <Badge variant="secondary">Ikke koblet</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Button size="sm" onClick={onConnect}>
            <Plus className="h-4 w-4 mr-2" />
            Koble til Meta-side
          </Button>
        </CardContent>
      </Card>
    );
  }

  const handleDelete = async () => {
    try {
      await deleteIntegration.mutateAsync(integration.id);
      toast({ title: 'Tilkobling slettet' });
    } catch (e: any) {
      toast({ title: 'Sletting feilet', description: e?.message, variant: 'destructive' });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-md border bg-blue-500/5 p-2">
              <Facebook className="h-4 w-4 text-blue-600" />
            </div>
            <div className="space-y-1">
              <CardTitle className="text-base">Meta Lead Ads</CardTitle>
              <CardDescription>
                {integration.page_name}
                <span className="ml-2 text-xs text-muted-foreground">
                  ID: {integration.page_id}
                </span>
              </CardDescription>
            </div>
          </div>
          {statusBadge(integration.status)}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="connection">
          <TabsList>
            <TabsTrigger value="connection">Tilkobling</TabsTrigger>
            <TabsTrigger value="forms">Skjemaer</TabsTrigger>
            <TabsTrigger value="health">Helse</TabsTrigger>
          </TabsList>

          <TabsContent value="connection" className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-md border bg-muted/30 px-3 py-2">
                <div className="text-xs text-muted-foreground">Søknader mottatt</div>
                <div className="font-semibold">{leadCount ?? 0}</div>
              </div>
              <div className="rounded-md border bg-muted/30 px-3 py-2">
                <div className="text-xs text-muted-foreground">Sist mottatt</div>
                <div className="font-semibold">
                  {integration.last_event_at
                    ? formatDistanceToNow(new Date(integration.last_event_at), {
                        addSuffix: true,
                        locale: nb,
                      })
                    : 'Aldri'}
                </div>
              </div>
            </div>
            {integration.status_message ? (
              <p className="text-xs text-muted-foreground">{integration.status_message}</p>
            ) : null}
            <div className="flex flex-wrap gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Rediger tilkobling
              </Button>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    <KeyRound className="h-4 w-4 mr-2" />
                    Forny token
                    <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-64">
                  <DropdownMenuItem onClick={onReconnect}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    <div className="flex flex-col items-start">
                      <span>Koble til på nytt (anbefalt)</span>
                      <span className="text-[10px] text-muted-foreground">
                        Logg inn med Facebook
                      </span>
                    </div>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onRefreshToken}>
                    <KeyRound className="h-4 w-4 mr-2" />
                    <div className="flex flex-col items-start">
                      <span>Skriv inn manuelt</span>
                      <span className="text-[10px] text-muted-foreground">
                        Lim inn nytt Page Access Token
                      </span>
                    </div>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Slett tilkobling
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Slett Meta-tilkobling?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Webhook fra Meta vil slutte å motta nye leads. Eksisterende søkere som
                      allerede er importert beholdes. Skjema-mappinger og logg-historikk for denne
                      tilkoblingen slettes også.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Avbryt</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Slett tilkobling
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </TabsContent>

          <TabsContent value="forms">
            <FormMappingsInline integrationId={integration.id} />
          </TabsContent>

          <TabsContent value="health">
            <MetaHealthTab integration={integration} onRefreshToken={onRefreshToken} onReconnect={onReconnect} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
