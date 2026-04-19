import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { AlertCircle } from 'lucide-react';
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
  const navigate = useNavigate();
  const { data: positions } = useJobPositions();
  const open = (positions ?? []).filter((p) => p.status === 'open');
  const positionTitle = open.find((p) => p.id === positionId)?.title;
  const noOpenPositions = open.length === 0;

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
          {noOpenPositions ? (
            <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
              <div className="space-y-2 flex-1">
                <p className="font-medium text-sm">Ingen åpne stillinger</p>
                <p className="text-sm text-muted-foreground">
                  Du må publisere en stilling før du kan importere søkere. Gå til Stillinger
                  og klikk "Publiser" på den stillingen du ønsker å koble søkerne til.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/operations/recruitment/positions')}
                >
                  Gå til stillinger
                </Button>
              </div>
            </div>
          ) : (
            <Select value={positionId} onValueChange={onPositionChange}>
              <SelectTrigger>
                <SelectValue placeholder="Velg stilling" />
              </SelectTrigger>
              <SelectContent>
                {open.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
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
