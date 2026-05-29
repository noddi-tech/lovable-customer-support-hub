import React, { useState } from 'react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';
import { Check, Loader2, Pencil, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import InlineEditableRow from './InlineEditableRow';
import {
  LANGUAGE_OPTIONS,
  LICENSE_CLASSES,
  PERMIT_OPTIONS,
} from '../edit/schema';
import { useUpdateApplicant } from '../hooks/useUpdateApplicant';
import type { ApplicantProfileData } from '../useApplicantProfile';

const LANG_LABELS: Record<string, string> = LANGUAGE_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.value]: o.label }),
  {} as Record<string, string>,
);

const PERMIT_LABELS: Record<string, string> = PERMIT_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.value]: o.label }),
  {} as Record<string, string>,
);

const Empty: React.FC = () => (
  <span className="text-muted-foreground">Ikke oppgitt</span>
);

interface RowProps {
  applicant: ApplicantProfileData;
}

/* ---------- Single-value rows (use InlineEditableRow) ---------- */

export const LocationRow: React.FC<RowProps> = ({ applicant }) => (
  <InlineEditableRow
    applicantId={applicant.id}
    field="location"
    label="Sted"
    type="text"
    rawValue={applicant.location ?? ''}
    display={applicant.location ? <span>{applicant.location}</span> : <Empty />}
  />
);

export const YearsExperienceRow: React.FC<RowProps> = ({ applicant }) => (
  <InlineEditableRow
    applicantId={applicant.id}
    field="years_experience"
    label="Erfaring"
    type="number"
    rawValue={applicant.years_experience == null ? '' : String(applicant.years_experience)}
    display={
      applicant.years_experience != null ? (
        <span>{applicant.years_experience} år</span>
      ) : (
        <Empty />
      )
    }
  />
);

export const OwnVehicleRow: React.FC<RowProps> = ({ applicant }) => (
  <InlineEditableRow
    applicantId={applicant.id}
    field="own_vehicle"
    label="Egen bil"
    type="boolean"
    rawValue={applicant.own_vehicle ?? false}
    display={
      applicant.own_vehicle == null ? (
        <Empty />
      ) : applicant.own_vehicle ? (
        <span>Ja</span>
      ) : (
        <span>Nei</span>
      )
    }
  />
);

export const AvailabilityDateRow: React.FC<RowProps> = ({ applicant }) => (
  <InlineEditableRow
    applicantId={applicant.id}
    field="availability_date"
    label="Tilgjengelig fra"
    type="date"
    rawValue={applicant.availability_date ?? ''}
    display={
      applicant.availability_date ? (
        <span>
          {format(new Date(applicant.availability_date), 'd. MMM yyyy', { locale: nb })}
        </span>
      ) : (
        <Empty />
      )
    }
  />
);

export const LanguageNorwegianRow: React.FC<RowProps> = ({ applicant }) => (
  <InlineEditableRow
    applicantId={applicant.id}
    field="language_norwegian"
    label="Norsk"
    type="select"
    options={LANGUAGE_OPTIONS}
    rawValue={applicant.language_norwegian}
    display={<span>{LANG_LABELS[applicant.language_norwegian] ?? <Empty />}</span>}
  />
);

export const WorkPermitStatusRow: React.FC<RowProps> = ({ applicant }) => (
  <InlineEditableRow
    applicantId={applicant.id}
    field="work_permit_status"
    label="Arbeidstillatelse"
    type="select"
    options={PERMIT_OPTIONS}
    rawValue={applicant.work_permit_status}
    display={<span>{PERMIT_LABELS[applicant.work_permit_status] ?? <Empty />}</span>}
  />
);

/* ---------- Multi-value rows (popover editors) ---------- */

const MultiValueRow: React.FC<{
  label: string;
  display: React.ReactNode;
  editor: (ctx: { close: () => void }) => React.ReactNode;
}> = ({ label, display, editor }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="group flex flex-col gap-1 py-2 border-b last:border-0">
      <dt className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        <span>{label}</span>
      </dt>
      <dd className="text-sm text-foreground">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">{display}</div>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={`Rediger ${label}`}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72">
              {editor({ close: () => setOpen(false) })}
            </PopoverContent>
          </Popover>
        </div>
      </dd>
    </div>
  );
};

export const DriverLicenseClassesRow: React.FC<RowProps> = ({ applicant }) => {
  const update = useUpdateApplicant();
  const current = applicant.drivers_license_classes ?? [];
  const [selected, setSelected] = useState<string[]>(current);

  // Re-sync local draft when the underlying value changes (after a save elsewhere).
  React.useEffect(() => {
    setSelected(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.join('|')]);

  const display = current.length ? (
    <div className="flex flex-wrap gap-1">
      {current.map((c) => (
        <Badge key={c} variant="secondary">
          {c}
        </Badge>
      ))}
    </div>
  ) : (
    <Empty />
  );

  const toggle = (c: string) =>
    setSelected((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  return (
    <MultiValueRow
      label="Førerkort"
      display={display}
      editor={({ close }) => (
        <div className="space-y-3">
          <div className="grid grid-cols-4 gap-2">
            {LICENSE_CLASSES.map((c) => {
              const checked = selected.includes(c);
              return (
                <label
                  key={c}
                  className="flex items-center gap-1.5 text-sm cursor-pointer"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={() => toggle(c)}
                  />
                  <span>{c}</span>
                </label>
              );
            })}
          </div>
          <div className="flex justify-end gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setSelected(current);
                close();
              }}
            >
              <X className="h-3.5 w-3.5" />
              Avbryt
            </Button>
            <Button
              size="sm"
              disabled={update.isPending}
              onClick={async () => {
                try {
                  await update.mutateAsync({
                    id: applicant.id,
                    patch: { drivers_license_classes: selected },
                  });
                  close();
                } catch {
                  /* toast handled in hook */
                }
              }}
            >
              {update.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Lagre
            </Button>
          </div>
        </div>
      )}
    />
  );
};

export const CertificationsRow: React.FC<RowProps> = ({ applicant }) => {
  const update = useUpdateApplicant();
  const current = applicant.certifications ?? [];
  const [items, setItems] = useState<string[]>(current);
  const [input, setInput] = useState('');

  React.useEffect(() => {
    setItems(current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current.join('|')]);

  const display = current.length ? (
    <div className="flex flex-wrap gap-1">
      {current.map((c) => (
        <Badge key={c} variant="secondary">
          {c}
        </Badge>
      ))}
    </div>
  ) : (
    <Empty />
  );

  const add = () => {
    const t = input.trim();
    if (!t) return;
    if (items.includes(t)) {
      setInput('');
      return;
    }
    setItems((p) => [...p, t]);
    setInput('');
  };

  const remove = (c: string) => setItems((p) => p.filter((x) => x !== c));

  return (
    <MultiValueRow
      label="Sertifiseringer"
      display={display}
      editor={({ close }) => (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1 min-h-[24px]">
            {items.map((c) => (
              <Badge key={c} variant="secondary" className="gap-1">
                {c}
                <button
                  type="button"
                  className="hover:text-destructive"
                  onClick={() => remove(c)}
                  aria-label={`Fjern ${c}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {items.length === 0 && (
              <span className="text-xs text-muted-foreground italic">Ingen lagt til</span>
            )}
          </div>
          <div className="flex gap-1.5">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  add();
                }
              }}
              placeholder="Skriv og trykk Enter"
              className="h-8"
            />
            <Button size="sm" variant="outline" onClick={add}>
              Legg til
            </Button>
          </div>
          <div className="flex justify-end gap-1.5">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setItems(current);
                setInput('');
                close();
              }}
            >
              <X className="h-3.5 w-3.5" />
              Avbryt
            </Button>
            <Button
              size="sm"
              disabled={update.isPending}
              onClick={async () => {
                try {
                  await update.mutateAsync({
                    id: applicant.id,
                    patch: { certifications: items },
                  });
                  close();
                } catch {
                  /* toast handled in hook */
                }
              }}
            >
              {update.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              Lagre
            </Button>
          </div>
        </div>
      )}
    />
  );
};
