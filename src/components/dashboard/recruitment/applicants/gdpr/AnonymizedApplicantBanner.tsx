import React from 'react';
import { ShieldOff } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  anonymizedAt: string | null | undefined;
}

/**
 * Phase 12: visible banner shown at the top of an applicant profile
 * once their PII has been erased per GDPR Article 17.
 */
const AnonymizedApplicantBanner: React.FC<Props> = ({ anonymizedAt }) => {
  if (!anonymizedAt) return null;
  let formatted = anonymizedAt;
  try {
    formatted = format(new Date(anonymizedAt), 'dd.MM.yyyy HH:mm');
  } catch {
    // keep raw string
  }
  return (
    <div
      role="status"
      className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive-foreground px-4 py-3 flex items-start gap-3"
    >
      <ShieldOff className="h-5 w-5 mt-0.5 shrink-0 text-destructive" />
      <div className="text-sm leading-relaxed">
        <div className="font-semibold text-destructive">Kandidaten er anonymisert</div>
        <div className="text-foreground/80">
          Personopplysningene ble slettet {formatted} i henhold til GDPR artikkel 17.
          Revisjonslogg, hendelser og aggregerte data er bevart.
        </div>
      </div>
    </div>
  );
};

export default AnonymizedApplicantBanner;
