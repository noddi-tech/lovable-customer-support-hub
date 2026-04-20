import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Wrench, Headphones, Users, User, Hash, AtSign, BellOff, RotateCcw, Info, Loader2 } from 'lucide-react';
import type { SlackIntegration, SlackMentionMode } from '@/hooks/useSlackIntegration';
import { useSlackSubteams, useSlackUsers } from '@/hooks/useSlackUsersAndSubteams';

interface Props {
  integration: SlackIntegration;
  onUpdate: (updates: Record<string, unknown>) => void;
  isPending: boolean;
}

type Bucket = 'tech' | 'ops';

const DEFAULT_CATEGORY_BUCKETS: Record<string, Bucket> = {
  service_failure: 'tech',
  data_issue: 'tech',
  billing_issue: 'ops',
  safety_concern: 'ops',
  frustrated_customer: 'ops',
  escalation_request: 'ops',
  legal_threat: 'ops',
};

const CATEGORY_META: Array<{ key: string; label: string; example: string }> = [
  { key: 'service_failure',     label: 'Tjenestefeil',         example: '"appen krasjer", "kan ikke logge inn"' },
  { key: 'data_issue',          label: 'Datafeil',             example: '"feil data vist", "mangler info"' },
  { key: 'billing_issue',       label: 'Betalingsproblem',     example: '"feil belastet", "betaling feilet"' },
  { key: 'safety_concern',      label: 'Sikkerhetsproblem',    example: '"skadet bil", "ulykke"' },
  { key: 'frustrated_customer', label: 'Frustrert kunde',      example: '"elendig service", "verste opplevelse"' },
  { key: 'escalation_request',  label: 'Eskalering',           example: '"snakke med leder", "klage"' },
  { key: 'legal_threat',        label: 'Rettslig trussel',     example: '"advokat", "stevning"' },
];

const MENTION_MODE_OPTIONS: Array<{ value: SlackMentionMode; label: string; icon: typeof Hash; help: string }> = [
  { value: 'channel', label: '@channel (alle i kanalen)', icon: Hash,    help: 'Pinger hele kanalen — høy synlighet, mest støy' },
  { value: 'subteam', label: 'Brukergruppe (subteam)',    icon: Users,   help: 'Pinger bare medlemmer av en Slack User Group' },
  { value: 'user',    label: 'Én person',                 icon: User,    help: 'Pinger én triage-ansvarlig som videresender' },
  { value: 'none',    label: 'Ingen ping (kun melding)',  icon: BellOff, help: 'Sender meldingen uten å pinge noen' },
];

interface BucketCardProps {
  bucket: Bucket;
  integration: SlackIntegration;
  onUpdate: Props['onUpdate'];
  isPending: boolean;
}

const BucketCard = ({ bucket, integration, onUpdate, isPending }: BucketCardProps) => {
  const Icon = bucket === 'tech' ? Wrench : Headphones;
  const title = bucket === 'tech' ? 'Tech-varsler' : 'Ops-varsler';
  const description = bucket === 'tech'
    ? 'Tekniske feil — appkrasj, betalings-API nede, datafeil'
    : 'Driftsproblemer — frustrerte kunder, eskaleringer, juridisk';

  const mode = (bucket === 'tech' ? integration.critical_tech_mention_mode : integration.critical_ops_mention_mode) || 'channel';
  const subteamId = bucket === 'tech' ? integration.critical_tech_subteam_id : integration.critical_ops_subteam_id;
  const userId = bucket === 'tech' ? integration.critical_tech_user_id : integration.critical_ops_user_id;

  const { data: subteams = [], isLoading: loadingSubteams } = useSlackSubteams(mode === 'subteam');
  const { data: users = [], isLoading: loadingUsers } = useSlackUsers(mode === 'user');

  const update = (patch: Record<string, unknown>) => {
    const prefixed: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) prefixed[`critical_${bucket}_${k}`] = v;
    onUpdate(prefixed);
  };

  const matchedCount = CATEGORY_META.filter(c => {
    const override = integration.critical_category_routing?.[c.key];
    const effective = override ?? DEFAULT_CATEGORY_BUCKETS[c.key];
    return effective === bucket;
  }).length;

  return (
    <Card className="bg-gradient-surface border-border/50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${bucket === 'tech' ? 'bg-primary/10' : 'bg-amber-500/10'}`}>
            <Icon className={`h-5 w-5 ${bucket === 'tech' ? 'text-primary' : 'text-amber-500'}`} />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base flex items-center gap-2">
              {title}
              <Badge variant="outline" className="text-xs">{matchedCount} kategorier</Badge>
            </CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label className="text-xs">Pingmetode</Label>
          <Select
            value={mode}
            onValueChange={(v) => update({ mention_mode: v as SlackMentionMode })}
            disabled={isPending}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MENTION_MODE_OPTIONS.map(o => {
                const OIcon = o.icon;
                return (
                  <SelectItem key={o.value} value={o.value}>
                    <div className="flex items-center gap-2">
                      <OIcon className="h-3.5 w-3.5" />
                      <span>{o.label}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {MENTION_MODE_OPTIONS.find(o => o.value === mode)?.help}
          </p>
        </div>

        {mode === 'subteam' && (
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />
              Brukergruppe (Slack User Group)
            </Label>
            <Select
              value={subteamId || ''}
              onValueChange={(v) => {
                const st = subteams.find(s => s.id === v);
                update({ subteam_id: v, subteam_handle: st?.handle || null });
              }}
              disabled={isPending || loadingSubteams}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingSubteams ? 'Laster…' : 'Velg en brukergruppe…'} />
              </SelectTrigger>
              <SelectContent>
                {subteams.length === 0 && !loadingSubteams && (
                  <div className="px-2 py-3 text-xs text-muted-foreground">
                    Ingen brukergrupper funnet. Opprett en i Slack først, eller sjekk at boten har <code>usergroups:read</code>-scope.
                  </div>
                )}
                {subteams.map(st => (
                  <SelectItem key={st.id} value={st.id}>
                    <div className="flex items-center gap-2">
                      <AtSign className="h-3 w-3" />
                      <span>{st.handle}</span>
                      <span className="text-xs text-muted-foreground">— {st.name}</span>
                      {st.user_count !== undefined && (
                        <Badge variant="outline" className="text-[10px] ml-1">{st.user_count}</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {mode === 'user' && (
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              Triage-ansvarlig
            </Label>
            <Select
              value={userId || ''}
              onValueChange={(v) => update({ user_id: v })}
              disabled={isPending || loadingUsers}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingUsers ? 'Laster…' : 'Velg en person…'} />
              </SelectTrigger>
              <SelectContent>
                {users.map(u => (
                  <SelectItem key={u.id} value={u.id}>
                    <div className="flex items-center gap-2">
                      <span>{u.display_name || u.real_name || u.name}</span>
                      {u.email && <span className="text-xs text-muted-foreground">— {u.email}</span>}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const CriticalAlertRouting = ({ integration, onUpdate, isPending }: Props) => {
  const [localRouting, setLocalRouting] = useState<Record<string, Bucket>>({});

  useEffect(() => {
    setLocalRouting(integration.critical_category_routing || {});
  }, [integration.critical_category_routing]);

  const effectiveBucket = (key: string): Bucket =>
    localRouting[key] ?? DEFAULT_CATEGORY_BUCKETS[key] ?? 'ops';

  const handleCategoryChange = (key: string, bucket: Bucket) => {
    const next = { ...localRouting, [key]: bucket };
    setLocalRouting(next);
    onUpdate({ critical_category_routing: next });
  };

  const handleResetDefaults = () => {
    setLocalRouting({});
    onUpdate({ critical_category_routing: {} });
  };

  return (
    <div className="space-y-4">
      <Alert className="bg-destructive/5 border-destructive/20">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <AlertDescription className="text-sm">
          <strong>Smart ping-routing for kritiske varsler.</strong> I stedet for å pinge <code className="text-xs bg-muted px-1 rounded">@channel</code> hver gang,
          kan du sende tech-feil til en gruppe utviklere og driftsproblemer til kundeservice. Hver kategori går til riktig team automatisk.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2">
        <BucketCard bucket="tech" integration={integration} onUpdate={onUpdate} isPending={isPending} />
        <BucketCard bucket="ops" integration={integration} onUpdate={onUpdate} isPending={isPending} />
      </div>

      {/* Category → Bucket mapping */}
      <Card className="bg-gradient-surface border-border/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Kategorier → Team</CardTitle>
              <CardDescription className="text-xs">
                Bestem hvilket team som får varsel for hver type problem. Endringene logges automatisk i revisjonsloggen.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetDefaults}
              disabled={isPending || Object.keys(localRouting).length === 0}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Tilbakestill
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {CATEGORY_META.map((cat, idx) => {
            const current = effectiveBucket(cat.key);
            const isOverride = localRouting[cat.key] !== undefined && localRouting[cat.key] !== DEFAULT_CATEGORY_BUCKETS[cat.key];
            return (
              <div key={cat.key}>
                {idx > 0 && <Separator className="my-1" />}
                <div className="flex items-center justify-between gap-3 py-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{cat.label}</span>
                      {isOverride && (
                        <Badge variant="outline" className="text-[10px] text-primary border-primary/40">Overstyrt</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">f.eks. {cat.example}</p>
                  </div>
                  <Select
                    value={current}
                    onValueChange={(v) => handleCategoryChange(cat.key, v as Bucket)}
                    disabled={isPending}
                  >
                    <SelectTrigger className="w-32 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tech">
                        <div className="flex items-center gap-1.5">
                          <Wrench className="h-3 w-3" />
                          Tech
                        </div>
                      </SelectItem>
                      <SelectItem value="ops">
                        <div className="flex items-center gap-1.5">
                          <Headphones className="h-3 w-3" />
                          Ops
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}
          <Alert className="mt-3 bg-muted/30 border-border/30">
            <Info className="h-3.5 w-3.5" />
            <AlertDescription className="text-xs">
              <strong>Tips:</strong> Flytt <code>billing_issue</code> til Tech hvis betalingsfeilene deres oftest er kode-relaterte (API-feil, integrasjonsproblemer)
              i stedet for kunde-disputter.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {isPending && (
        <div className="flex items-center justify-center text-xs text-muted-foreground gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" /> Lagrer…
        </div>
      )}
    </div>
  );
};
