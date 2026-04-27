import React, { useState } from 'react';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import InlineEditField, { type InlineFieldType, type InlineSelectOption } from './InlineEditField';
import SourceChangeWarningDialog from '../edit/SourceChangeWarningDialog';
import GDPRRevocationDialog from '../edit/GDPRRevocationDialog';
import { useUpdateApplicant, EMAIL_CONFLICT, type ApplicantPatch } from '../hooks/useUpdateApplicant';

type InlineKind = InlineFieldType | 'boolean';

interface Props {
  applicantId: string;
  field: keyof ApplicantPatch;
  label: string;
  display: React.ReactNode;
  /** Raw current value (string-coerced for input prefill, or boolean). */
  rawValue: string | boolean | null | undefined;
  type: InlineKind;
  options?: readonly InlineSelectOption[];
  /** When true and field is 'gdpr_consent', toggling false → triggers revocation dialog. */
  gdprGuard?: boolean;
}

const InlineEditableRow: React.FC<Props> = ({
  applicantId,
  field,
  label,
  display,
  rawValue,
  type,
  options,
  gdprGuard,
}) => {
  const [editing, setEditing] = useState(false);
  const [sourceWarn, setSourceWarn] = useState<{ from: string; to: string } | null>(null);
  const [gdprWarn, setGdprWarn] = useState(false);
  const updateMut = useUpdateApplicant();

  const persist = async (patch: ApplicantPatch) => {
    try {
      await updateMut.mutateAsync({ id: applicantId, patch });
      setEditing(false);
      setSourceWarn(null);
      setGdprWarn(false);
    } catch {
      // toast handled in hook; revert UI to display
      setEditing(false);
      setSourceWarn(null);
      setGdprWarn(false);
    }
  };

  const handleSave = (next: string) => {
    if (field === 'source') {
      const from = String(rawValue ?? '');
      if (from !== next) {
        setSourceWarn({ from, to: next });
        return;
      }
    }
    const patch: ApplicantPatch = {} as any;
    if (type === 'number') {
      (patch as any)[field] = next === '' ? null : Number(next);
    } else if (next === '' && (field === 'phone' || field === 'location' || field === 'availability_date')) {
      (patch as any)[field] = null;
    } else {
      (patch as any)[field] = next;
    }
    void persist(patch);
  };

  const toggleBoolean = () => {
    const current = rawValue === true;
    const next = !current;
    if (field === 'gdpr_consent' && gdprGuard && current && !next) {
      setGdprWarn(true);
      return;
    }
    const patch: ApplicantPatch = {} as any;
    (patch as any)[field] = next;
    if (field === 'gdpr_consent' && !next) {
      patch.gdpr_consent_at = null;
    }
    void persist(patch);
  };

  return (
    <div
      className={cn(
        'group flex flex-col gap-1 py-2 border-b last:border-0',
      )}
    >
      <dt className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        <span>{label}</span>
      </dt>
      <dd className="text-sm text-foreground">
        {editing && type !== 'boolean' ? (
          <InlineEditField
            type={type}
            initialValue={rawValue == null ? '' : String(rawValue)}
            options={options}
            isPending={updateMut.isPending}
            onSave={handleSave}
            onCancel={() => setEditing(false)}
          />
        ) : (
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">{display}</div>
            {type === 'boolean' ? (
              <button
                type="button"
                className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-muted-foreground hover:text-foreground"
                onClick={toggleBoolean}
                disabled={updateMut.isPending}
              >
                {rawValue === true ? 'Sett Nei' : 'Sett Ja'}
              </button>
            ) : (
              <button
                type="button"
                aria-label={`Rediger ${label}`}
                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
                onClick={() => setEditing(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </dd>

      {sourceWarn && (
        <SourceChangeWarningDialog
          open={!!sourceWarn}
          onOpenChange={(o) => {
            if (!o) setSourceWarn(null);
          }}
          fromValue={sourceWarn.from}
          toValue={sourceWarn.to}
          isPending={updateMut.isPending}
          onConfirm={() => {
            void persist({ source: sourceWarn.to } as ApplicantPatch);
          }}
        />
      )}

      {gdprWarn && (
        <GDPRRevocationDialog
          open={gdprWarn}
          onOpenChange={setGdprWarn}
          isPending={updateMut.isPending}
          onConfirm={() => {
            void persist({ gdpr_consent: false, gdpr_consent_at: null });
          }}
        />
      )}
    </div>
  );
};

export default InlineEditableRow;
