import React, { useMemo } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';
import {
  TARGET_FIELD_LABELS,
  mapRow,
  isValidEmail,
  type TargetField,
} from './parseFile';

interface Props {
  headers: string[];
  rows: Record<string, string>[];
  mapping: Record<string, TargetField>;
  onMappingChange: (m: Record<string, TargetField>) => void;
  onBack: () => void;
  onNext: () => void;
}

const ORDER: TargetField[] = [
  'ignore',
  'first_name',
  'last_name',
  'full_name',
  'email',
  'phone',
  'location',
  'drivers_license_classes',
  'years_experience',
  'note',
  'metadata',
];

const ImportMappingStep: React.FC<Props> = ({
  headers,
  rows,
  mapping,
  onMappingChange,
  onBack,
  onNext,
}) => {
  const hasEmail = useMemo(() => Object.values(mapping).includes('email'), [mapping]);

  const preview = useMemo(
    () => rows.slice(0, 5).map((r) => mapRow(r, mapping)),
    [rows, mapping]
  );

  const validCount = useMemo(
    () => rows.filter((r) => isValidEmail(mapRow(r, mapping).email)).length,
    [rows, mapping]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Koble kolonner</h3>
          <p className="text-sm text-muted-foreground">
            Velg hvilket felt hver kolonne skal importeres som.
          </p>
        </div>
        <Badge variant="secondary">
          {validCount} av {rows.length} gyldige rader
        </Badge>
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-1/2">CSV-kolonne</TableHead>
              <TableHead>Felt</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {headers.map((h) => (
              <TableRow key={h}>
                <TableCell className="font-medium">{h}</TableCell>
                <TableCell>
                  <Select
                    value={mapping[h] ?? 'ignore'}
                    onValueChange={(v) =>
                      onMappingChange({ ...mapping, [h]: v as TargetField })
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ORDER.map((t) => (
                        <SelectItem key={t} value={t}>
                          {TARGET_FIELD_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div>
        <h4 className="text-sm font-medium mb-2">Forhåndsvisning (første 5 rader)</h4>
        <Card className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornavn</TableHead>
                <TableHead>Etternavn</TableHead>
                <TableHead>E-post</TableHead>
                <TableHead>Telefon</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.map((p, i) => {
                const invalid = !isValidEmail(p.email);
                return (
                  <TableRow key={i} className={invalid ? 'bg-destructive/10' : ''}>
                    <TableCell>{p.first_name || '—'}</TableCell>
                    <TableCell>{p.last_name || '—'}</TableCell>
                    <TableCell className={invalid ? 'text-destructive' : ''}>
                      {p.email || 'Mangler e-post'}
                    </TableCell>
                    <TableCell>{p.phone || '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>

      {invalidRows.length > 0 && (
        <Card className="p-4 bg-destructive/5 border-destructive/30">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium">
                {invalidRows.length} rader har ugyldig eller manglende e-post og vil bli hoppet
                over ved import.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {invalidRows.slice(0, 5).map((r) => (
                  <li key={r.rowNum}>
                    <span className="font-medium text-foreground">Rad {r.rowNum}:</span>{' '}
                    {r.reason}
                    {r.name && ` (${r.name})`}
                  </li>
                ))}
                {invalidRows.length > 5 && (
                  <li className="italic">… og {invalidRows.length - 5} flere</li>
                )}
              </ul>
            </div>
          </div>
        </Card>
      )}

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={onBack}>
          Tilbake
        </Button>
        <Button onClick={onNext} disabled={!hasEmail || validCount === 0}>
          Neste
        </Button>
      </div>
      {!hasEmail && (
        <p className="text-xs text-destructive text-right">
          Du må koble én kolonne til "E-post" for å fortsette.
        </p>
      )}
    </div>
  );
};

export default ImportMappingStep;
