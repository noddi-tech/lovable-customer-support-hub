import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ACTION_OPTIONS, type ActionType } from '../types';
import {
  useActiveTemplatesForOrg,
  useAssignableUsersForOrg,
} from '../hooks/useRules';

interface Props {
  actionType: ActionType;
  actionConfig: Record<string, unknown>;
  onActionTypeChange: (value: ActionType) => void;
  onActionConfigChange: (config: Record<string, unknown>) => void;
  errors?: {
    template_id?: { message?: string };
    user_id?: { message?: string };
    url?: { message?: string };
  };
}

interface HeaderRow {
  key: string;
  value: string;
}

function headersObjectToRows(obj: unknown): HeaderRow[] {
  if (!obj || typeof obj !== 'object') return [];
  return Object.entries(obj as Record<string, unknown>).map(([key, value]) => ({
    key,
    value: typeof value === 'string' ? value : JSON.stringify(value),
  }));
}

function rowsToHeadersObject(rows: HeaderRow[]): Record<string, string> | undefined {
  const filtered = rows.filter((r) => r.key.trim());
  if (filtered.length === 0) return undefined;
  return Object.fromEntries(filtered.map((r) => [r.key.trim(), r.value]));
}

export function ActionConfigSection({
  actionType,
  actionConfig,
  onActionTypeChange,
  onActionConfigChange,
  errors,
}: Props) {
  const { data: templates, isLoading: templatesLoading } = useActiveTemplatesForOrg();
  const { data: users, isLoading: usersLoading } = useAssignableUsersForOrg();

  const setConfigField = (key: string, value: unknown) => {
    const next = { ...actionConfig };
    if (value === undefined || value === '' || value === null) {
      delete next[key];
    } else {
      next[key] = value;
    }
    onActionConfigChange(next);
  };

  const headerRows = headersObjectToRows(actionConfig.headers);

  const updateHeaderRows = (rows: HeaderRow[]) => {
    const obj = rowsToHeadersObject(rows);
    const next = { ...actionConfig };
    if (obj) next.headers = obj;
    else delete next.headers;
    onActionConfigChange(next);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Handling</h3>
        <p className="text-xs text-muted-foreground">
          Hva skal skje når utløseren matcher?
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rule-action-type" className="text-xs font-medium">
          Type <span className="text-destructive">*</span>
        </Label>
        <Select
          value={actionType}
          onValueChange={(v) => {
            const opt = ACTION_OPTIONS.find((o) => o.value === v);
            if (opt?.disabled) return;
            onActionTypeChange(v as ActionType);
          }}
        >
          <SelectTrigger id="rule-action-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <TooltipProvider delayDuration={200}>
              {ACTION_OPTIONS.map((opt) => {
                const item = (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    disabled={opt.disabled}
                  >
                    <span
                      className={
                        opt.disabled
                          ? 'flex items-center gap-2 text-muted-foreground'
                          : 'flex items-center gap-2'
                      }
                    >
                      {opt.label}
                      {opt.comingSoon && (
                        <span className="text-[10px] text-muted-foreground italic">
                          (kommer senere)
                        </span>
                      )}
                    </span>
                  </SelectItem>
                );
                if (!opt.comingSoon) return item;
                return (
                  <Tooltip key={opt.value}>
                    <TooltipTrigger asChild>
                      <span>{item}</span>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      Kommer i en senere fase.
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </TooltipProvider>
          </SelectContent>
        </Select>
      </div>

      {actionType === 'send_email' && (
        <div className="space-y-1.5">
          <Label htmlFor="rule-action-template" className="text-xs font-medium">
            E-postmal <span className="text-destructive">*</span>
          </Label>
          {templatesLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Laster maler...
            </div>
          ) : (templates ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Ingen aktive e-postmaler. Opprett en under E-postmaler-fanen.
            </p>
          ) : (
            <Select
              value={(actionConfig.template_id as string) ?? ''}
              onValueChange={(v) => setConfigField('template_id', v)}
            >
              <SelectTrigger id="rule-action-template">
                <SelectValue placeholder="Velg mal..." />
              </SelectTrigger>
              <SelectContent>
                {(templates ?? []).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <div className="flex flex-col">
                      <span>{t.name}</span>
                      <span className="text-[10px] text-muted-foreground truncate max-w-[280px]">
                        {t.subject}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {errors?.template_id?.message && (
            <p className="text-xs text-destructive">{errors.template_id.message}</p>
          )}
        </div>
      )}

      {actionType === 'assign_to' && (
        <div className="space-y-1.5">
          <Label htmlFor="rule-action-user" className="text-xs font-medium">
            Tildel til <span className="text-destructive">*</span>
          </Label>
          {usersLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Laster brukere...
            </div>
          ) : (
            <Select
              value={(actionConfig.user_id as string) ?? ''}
              onValueChange={(v) => setConfigField('user_id', v)}
            >
              <SelectTrigger id="rule-action-user">
                <SelectValue placeholder="Velg bruker..." />
              </SelectTrigger>
              <SelectContent>
                {(users ?? []).map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {(u.full_name ?? '(uten navn)') + ` (${u.role})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {errors?.user_id?.message && (
            <p className="text-xs text-destructive">{errors.user_id.message}</p>
          )}
        </div>
      )}

      {actionType === 'webhook' && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rule-action-url" className="text-xs font-medium">
              URL <span className="text-destructive">*</span>
            </Label>
            <Input
              id="rule-action-url"
              type="url"
              value={(actionConfig.url as string) ?? ''}
              onChange={(e) => setConfigField('url', e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
            />
            {errors?.url?.message && (
              <p className="text-xs text-destructive">{errors.url.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Headers (valgfritt)</Label>
            <p className="text-[11px] text-muted-foreground">
              Egendefinerte HTTP-headers som sendes med forespørselen.
            </p>
            <div className="space-y-2">
              {headerRows.length === 0 && (
                <p className="text-[11px] text-muted-foreground italic">
                  Ingen headers lagt til.
                </p>
              )}
              {headerRows.map((row, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <Input
                    value={row.key}
                    onChange={(e) => {
                      const copy = [...headerRows];
                      copy[idx] = { ...copy[idx], key: e.target.value };
                      updateHeaderRows(copy);
                    }}
                    placeholder="Header-navn"
                    className="flex-1"
                  />
                  <Input
                    value={row.value}
                    onChange={(e) => {
                      const copy = [...headerRows];
                      copy[idx] = { ...copy[idx], value: e.target.value };
                      updateHeaderRows(copy);
                    }}
                    placeholder="Verdi"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Fjern header"
                    onClick={() => {
                      const copy = headerRows.filter((_, i) => i !== idx);
                      updateHeaderRows(copy);
                    }}
                  >
                    <Trash2 />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => updateHeaderRows([...headerRows, { key: '', value: '' }])}
              >
                <Plus />
                Legg til header
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rule-action-msg" className="text-xs font-medium">
              Meldingsmal (valgfritt)
            </Label>
            <p className="text-[11px] text-muted-foreground">
              For Slack-webhooks: hvis angitt, erstattes hele bodyen med {'{text: rendered}'}. Bruk{' '}
              <code className="font-mono">{'{{context.to_stage_id}}'}</code> og{' '}
              <code className="font-mono">{'{{rule.name}}'}</code> som plassholdere.
            </p>
            <Textarea
              id="rule-action-msg"
              rows={3}
              emojiAutocomplete={false}
              value={(actionConfig.message_template as string) ?? ''}
              onChange={(e) => setConfigField('message_template', e.target.value)}
              placeholder="Valgfri melding..."
            />
          </div>
        </div>
      )}
    </div>
  );
}
