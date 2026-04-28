export interface FormatContext {
  userMap?: Map<string, string>;
  stageMap?: Map<string, string>;
  positionMap?: Map<string, string>;
}

const UUID_FIELDS = new Set(['assigned_to', 'uploaded_by', 'performed_by', 'author_id']);

export function formatValue(
  fieldName: string,
  value: unknown,
  ctx?: FormatContext,
): string {
  if (value === null || value === undefined) return 'Ikke oppgitt';

  // UUID lookups
  if (UUID_FIELDS.has(fieldName)) {
    if (typeof value === 'string' && ctx?.userMap?.has(value)) {
      return ctx.userMap.get(value)!;
    }
    return typeof value === 'string' ? value.slice(0, 8) + '…' : String(value);
  }

  if (fieldName === 'current_stage_id') {
    if (typeof value === 'string' && ctx?.stageMap?.has(value)) {
      return ctx.stageMap.get(value)!;
    }
    const stageNames: Record<string, string> = {
      not_reviewed: 'Ikke vurdert',
      qualified: 'Kvalifisert',
      hired: 'Ansatt',
      disqualified: 'Diskvalifisert',
    };
    return stageNames[String(value)] ?? String(value);
  }

  // Enum translations
  if (fieldName === 'source') {
    const sources: Record<string, string> = {
      manual: 'Manuell',
      csv_import: 'CSV-import',
      meta_lead_ad: 'Meta Lead Ads',
      finn: 'Finn.no',
      website: 'Nettsted',
      referral: 'Henvist',
      other: 'Annet',
    };
    return sources[String(value)] ?? String(value);
  }

  if (fieldName === 'language_norwegian') {
    const langs: Record<string, string> = {
      native: 'Morsmål',
      fluent: 'Flytende',
      intermediate: 'Middels',
      basic: 'Grunnleggende',
      none: 'Ingen',
    };
    return langs[String(value)] ?? String(value);
  }

  if (fieldName === 'work_permit_status') {
    const permits: Record<string, string> = {
      citizen: 'Statsborger',
      permanent: 'Permanent',
      temporary: 'Midlertidig',
      none: 'Ingen',
      applying: 'Søker',
    };
    return permits[String(value)] ?? String(value);
  }

  if (fieldName === 'note_type') {
    const types: Record<string, string> = {
      internal: 'Internt',
      interview: 'Intervju',
      decision: 'Avgjørelse',
      contact: 'Kontakt',
    };
    return types[String(value)] ?? String(value);
  }

  if (fieldName === 'file_type') {
    const types: Record<string, string> = {
      resume: 'CV',
      cover_letter: 'Søknadsbrev',
      certificate: 'Sertifikat',
      id_doc: 'ID-dokument',
      other: 'Annet',
    };
    return types[String(value)] ?? String(value);
  }

  // Booleans
  if (typeof value === 'boolean') {
    return value ? 'Ja' : 'Nei';
  }

  // Dates (ISO strings)
  if (
    fieldName === 'availability_date' ||
    fieldName === 'applied_at' ||
    fieldName === 'created_at' ||
    fieldName === 'updated_at' ||
    fieldName === 'gdpr_consent_at' ||
    fieldName === 'occurred_at'
  ) {
    if (typeof value === 'string') {
      try {
        const d = new Date(value);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('nb-NO', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          });
        }
      } catch {
        /* fallthrough */
      }
    }
  }

  // File size
  if (fieldName === 'file_size' && typeof value === 'number') {
    if (value < 1024) return `${value} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  // Arrays
  if (Array.isArray(value)) {
    return value.length === 0 ? 'Ingen' : value.join(', ');
  }

  // Objects (JSONB)
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  return String(value);
}
