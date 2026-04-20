import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Tag, Plus, X, Volume2, VolumeX, Info, Loader2,
} from 'lucide-react';
import { useKeywordOverrides, BASE_CRITICAL_KEYWORDS } from '@/hooks/useKeywordOverrides';
import { useTriageHealth } from '@/hooks/useTriageHealth';
import { formatDistanceToNow } from 'date-fns';
import { nb } from 'date-fns/locale';

export const KeywordTuningCard = () => {
  const { data, isLoading, updateOverrides, unmuteKeyword } = useKeywordOverrides();
  const { data: health } = useTriageHealth();
  const [newKeyword, setNewKeyword] = useState('');

  if (isLoading || !data) {
    return (
      <Card className="bg-gradient-surface border-border/50">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const { overrides } = data;
  const activeMutes = health?.active_mutes || [];

  const handleDisable = (kw: string) => {
    const k = kw.toLowerCase().trim();
    if (!k) return;
    updateOverrides.mutate({
      disabled: Array.from(new Set([...overrides.disabled, k])),
      added: overrides.added.filter((a) => a !== k),
    });
  };

  const handleEnable = (kw: string) => {
    updateOverrides.mutate({
      disabled: overrides.disabled.filter((d) => d !== kw),
      added: overrides.added,
    });
  };

  const handleAdd = () => {
    const k = newKeyword.toLowerCase().trim();
    if (!k) return;
    updateOverrides.mutate({
      disabled: overrides.disabled.filter((d) => d !== k),
      added: Array.from(new Set([...overrides.added, k])),
    });
    setNewKeyword('');
  };

  const handleRemoveAdded = (kw: string) => {
    updateOverrides.mutate({
      disabled: overrides.disabled,
      added: overrides.added.filter((a) => a !== kw),
    });
  };

  const disabledSet = new Set(overrides.disabled);
  const addedSet = new Set(overrides.added);

  return (
    <Card className="bg-gradient-surface border-border/50">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Tag className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <CardTitle className="text-base">Nøkkelord-tilpasning</CardTitle>
            <CardDescription className="text-xs">
              Slå av støyende nøkkelord eller legg til nye. Endringer trer i kraft umiddelbart for nye varsler.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new keyword */}
        <div className="space-y-2">
          <Label className="text-xs">Legg til nytt nøkkelord</Label>
          <div className="flex gap-2">
            <Input
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="f.eks. pin-kode, kode kommer ikke"
              className="text-sm h-8"
              disabled={updateOverrides.isPending}
            />
            <Button onClick={handleAdd} size="sm" disabled={!newKeyword.trim() || updateOverrides.isPending}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Legg til
            </Button>
          </div>
        </div>

        {/* Custom added keywords */}
        {overrides.added.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs">Egne nøkkelord ({overrides.added.length})</Label>
            <div className="flex flex-wrap gap-1.5">
              {overrides.added.map((kw) => (
                <Badge key={kw} variant="outline" className="text-xs gap-1 pr-1 border-primary/40">
                  {kw}
                  <button
                    onClick={() => handleRemoveAdded(kw)}
                    className="hover:bg-destructive/20 rounded-sm p-0.5"
                    disabled={updateOverrides.isPending}
                    aria-label={`Fjern ${kw}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Active mutes */}
        {activeMutes.length > 0 && (
          <>
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1.5">
                <VolumeX className="h-3.5 w-3.5" />
                Midlertidig dempet ({activeMutes.length})
              </Label>
              <div className="space-y-1">
                {activeMutes.map((m) => (
                  <div key={m.id} className="flex items-center justify-between text-xs bg-muted/30 rounded px-2 py-1.5">
                    <div className="flex items-center gap-2">
                      <code className="bg-background px-1.5 py-0.5 rounded text-[11px]">{m.keyword}</code>
                      <span className="text-muted-foreground">
                        utløper om {formatDistanceToNow(new Date(m.expires_at), { locale: nb })}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 px-2"
                      onClick={() => unmuteKeyword.mutate(m.id)}
                      disabled={unmuteKeyword.isPending}
                    >
                      <Volume2 className="h-3 w-3 mr-1" />
                      Opphev
                    </Button>
                  </div>
                ))}
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Base keyword list with toggle */}
        <div className="space-y-2">
          <Label className="text-xs">Standardnøkkelord ({BASE_CRITICAL_KEYWORDS.length} totalt, {disabledSet.size} avslått)</Label>
          <div className="max-h-48 overflow-y-auto flex flex-wrap gap-1.5 p-2 rounded border border-border/50 bg-muted/10">
            {BASE_CRITICAL_KEYWORDS.map((kw) => {
              const isDisabled = disabledSet.has(kw);
              return (
                <button
                  key={kw}
                  onClick={() => (isDisabled ? handleEnable(kw) : handleDisable(kw))}
                  disabled={updateOverrides.isPending}
                  className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
                    isDisabled
                      ? 'bg-muted text-muted-foreground line-through hover:bg-muted/80'
                      : 'bg-primary/10 text-primary hover:bg-primary/20'
                  }`}
                >
                  {kw}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Klikk for å slå av/på. Avslåtte nøkkelord trigger ikke lenger varsler.
          </p>
        </div>

        <Alert className="bg-muted/30 border-border/30">
          <Info className="h-3.5 w-3.5" />
          <AlertDescription className="text-xs">
            <strong>Tips:</strong> Du kan også dempe et nøkkelord direkte fra Slack ved å reagere med 🔇 på et varsel — det demper i 7 dager automatisk.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
