import React, { useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useJobPositions } from '../positions/usePositions';

const SOURCES = ['Meta Lead Ad', 'Finn.no', 'CSV Import', 'Nettside', 'Referanse'];

interface Props {
  validCount: number;
  positionId: string;
  source: string;
  gdprConfirmed: boolean;
  onPositionChange: (id: string) => void;
  onSourceChange: (s: string) => void;
  onGdprChange: (b: boolean) => void;
  onBack: () => void;
  onImport: () => void;
}

const ImportConfigureStep: React.FC<Props> = ({
  validCount,
  positionId,
  source,
  gdprConfirmed,
  onPositionChange,
  onSourceChange,
  onGdprChange,
  onBack,
  onImport,
}) => {
  const { data: positions } = useJobPositions();
  const open = (positions ?? []).filter((p) => p.status === 'open');
  const positionTitle = open.find((p) => p.id === positionId)?.title;

  useEffect(() => {
    if (source === 'Meta Lead Ad' && !gdprConfirmed) onGdprChange(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source]);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h3 className="text-lg font-semibold">Konfigurer import</h3>
        <p className="text-sm text-muted-foreground">
          Velg stilling, kilde og bekreft samtykke før import starter.
        </p>
      </div>

      <Card className="space-y-5 p-6">
        <div className="space-y-2">
          <Label>Hvilken stilling søker de på? *</Label>
          <Select value={positionId} onValueChange={onPositionChange}>
            <SelectTrigger>
              <SelectValue placeholder="Velg stilling" />
            </SelectTrigger>
            <SelectContent>
              {open.length === 0 && (
                <SelectItem value="__none__" disabled>
                  Ingen åpne stillinger
                </SelectItem>
              )}
              {open.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Kilde</Label>
          <Select value={source} onValueChange={onSourceChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SOURCES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-start gap-3 rounded-md border p-3 bg-muted/30">
          <Checkbox
            id="gdpr"
            checked={gdprConfirmed}
            onCheckedChange={(v) => onGdprChange(!!v)}
            className="mt-0.5"
          />
          <Label htmlFor="gdpr" className="text-sm leading-relaxed cursor-pointer font-normal">
            Alle søkere har gitt samtykke til behandling av personopplysninger. Meta Lead Ads
            krever samtykke, men bekreft at du har rettmessig grunnlag.
          </Label>
        </div>
      </Card>

      <Card className="p-4 bg-primary/5 border-primary/20">
        <p className="text-sm">
          Vil importere <strong>{validCount} søkere</strong>
          {positionTitle ? (
            <>
              {' '}til stillingen <strong>"{positionTitle}"</strong>
            </>
          ) : null}
          .
        </p>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          Tilbake
        </Button>
        <Button onClick={onImport} disabled={!positionId || !gdprConfirmed || validCount === 0}>
          Importer {validCount} søkere
        </Button>
      </div>
    </div>
  );
};

export default ImportConfigureStep;
