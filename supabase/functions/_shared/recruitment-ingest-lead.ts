// Shared helper: ingest a single Meta lead into the recruitment system
// using the recruitment_form_field_mappings + recruitment_custom_fields
// + recruitment_applicant_field_values pipeline.
//
// Used by both meta-lead-webhook (live) and recruitment-bulk-import-execute.

export type TargetKind = 'standard' | 'custom' | 'metadata_only';
export type StandardField = 'full_name' | 'email' | 'phone_number';

export interface FormFieldMappingRow {
  id: string;
  form_mapping_id: string;
  meta_question_id: string;
  meta_question_key: string | null;
  meta_question_text: string;
  target_kind: TargetKind;
  target_standard_field: StandardField | null;
  target_custom_field_id: string | null;
}

export interface CustomFieldRow {
  id: string;
  field_key: string;
  display_name: string;
  type_id: string;
  type_key?: string; // joined
}

export interface MetaFieldDataItem {
  name: string;
  values?: string[];
}

export interface IngestOptions {
  importedVia: 'webhook' | 'bulk_import';
  bulkImportId?: string | null;
  approvalMode?: 'direct' | 'quarantine';
  targetStageId?: string | null;
}

export interface IngestResult {
  status: 'imported' | 'duplicate' | 'unmapped' | 'failed';
  applicantId?: string;
  errorMessage?: string;
}

/**
 * Coerce a raw Meta string value into the right JSON shape for a custom field.
 */
export function coerceValueForType(typeKey: string, raw: string): unknown {
  const trimmed = (raw ?? '').trim();
  switch (typeKey) {
    case 'number': {
      const n = Number(trimmed);
      return Number.isFinite(n) ? n : trimmed;
    }
    case 'boolean':
      return /^(true|yes|ja|1|on)$/i.test(trimmed);
    case 'multi_select':
      // Meta returns single value per name typically; allow comma-split as fallback.
      return trimmed.includes(',')
        ? trimmed.split(',').map((s) => s.trim()).filter(Boolean)
        : [trimmed];
    case 'date':
    case 'datetime':
      return trimmed; // ISO-ish string; UI parses
    default:
      return trimmed;
  }
}

export interface LeadInput {
  meta_lead_id: string;
  form_id: string;
  page_id?: string;
  created_time?: string | null;
  field_data: MetaFieldDataItem[];
}

/**
 * Ingest one lead.
 */
export async function ingestLead(
  supabase: any,
  organizationId: string,
  integrationId: string,
  formMappingId: string,
  positionId: string | null,
  fieldMappings: FormFieldMappingRow[],
  customFields: Map<string, CustomFieldRow>, // by field_id
  lead: LeadInput,
  opts: IngestOptions,
): Promise<IngestResult> {
  // Dedup against applicants.external_id
  const { data: existing } = await supabase
    .from('applicants')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('external_id', lead.meta_lead_id)
    .maybeSingle();

  if (existing) {
    return { status: 'duplicate', applicantId: existing.id };
  }

  // Build mapping indexes: prefer match by meta_question_key (the slug Meta sends
  // in webhook field_data[].name), fall back to meta_question_id (legacy rows
  // saved before the key column existed).
  const mappingByKey = new Map<string, FormFieldMappingRow>();
  const mappingById = new Map<string, FormFieldMappingRow>();
  for (const m of fieldMappings) {
    if (m.meta_question_key) mappingByKey.set(m.meta_question_key, m);
    if (m.meta_question_id) mappingById.set(m.meta_question_id, m);
  }

  // If there are no mappings at all, treat as unmapped
  if (fieldMappings.length === 0) {
    return { status: 'unmapped' };
  }

  let fullName = '';
  let email = '';
  let phone: string | null = null;
  const metadataExtras: Record<string, unknown> = {};
  const unmappedExtras: Record<string, string> = {};
  const customValuePayloads: Array<{ field_id: string; value: unknown; raw_value: string }> = [];

  for (const fd of lead.field_data) {
    const raw = (fd.values?.[0] ?? '').toString();
    const mapping = mappingByQid.get(fd.name);
    if (!mapping) {
      // Try fallback: standard meta keys
      if (fd.name === 'full_name' || fd.name === 'name') fullName = fullName || raw;
      else if (fd.name === 'email' || fd.name === 'email_address') email = email || raw;
      else if (fd.name === 'phone_number' || fd.name === 'phone') phone = phone || raw;
      else unmappedExtras[fd.name] = raw;
      continue;
    }

    if (mapping.target_kind === 'standard') {
      if (mapping.target_standard_field === 'full_name') fullName = raw;
      else if (mapping.target_standard_field === 'email') email = raw;
      else if (mapping.target_standard_field === 'phone_number') phone = raw || null;
    } else if (mapping.target_kind === 'custom' && mapping.target_custom_field_id) {
      const cf = customFields.get(mapping.target_custom_field_id);
      if (cf) {
        const value = coerceValueForType(cf.type_key ?? 'text', raw);
        customValuePayloads.push({
          field_id: cf.id,
          value: value as any,
          raw_value: raw,
        });
      } else {
        unmappedExtras[fd.name] = raw;
      }
    } else if (mapping.target_kind === 'metadata_only') {
      metadataExtras[mapping.meta_question_id] = raw;
    }
  }

  if (!fullName && !email) {
    return { status: 'failed', errorMessage: 'No name or email in lead data' };
  }

  const nameParts = (fullName || email.split('@')[0] || 'Ukjent').split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] ?? 'Ukjent';
  const lastName = nameParts.slice(1).join(' ') || '—';

  const importStatus =
    opts.importedVia === 'bulk_import' && opts.approvalMode === 'quarantine'
      ? 'pending_review'
      : opts.importedVia === 'bulk_import'
        ? 'approved'
        : null;

  const { data: newApplicant, error: applicantErr } = await supabase
    .from('applicants')
    .insert({
      organization_id: organizationId,
      first_name: firstName,
      last_name: lastName,
      email: email || `unknown-${lead.meta_lead_id}@no-email.local`,
      phone,
      source: 'meta_lead_ad',
      external_id: lead.meta_lead_id,
      source_details: {
        field_data: lead.field_data,
        form_id: lead.form_id,
        page_id: lead.page_id ?? null,
        created_time: lead.created_time ?? null,
        unmapped: unmappedExtras,
        metadata_only: metadataExtras,
      },
      gdpr_consent: true,
      gdpr_consent_at: new Date().toISOString(),
      imported_via: opts.importedVia,
      imported_via_bulk_import_id: opts.bulkImportId ?? null,
      import_status: importStatus,
    })
    .select('id')
    .single();

  if (applicantErr || !newApplicant) {
    const isUnique = (applicantErr as any)?.code === '23505';
    if (isUnique) {
      return { status: 'duplicate', errorMessage: applicantErr?.message };
    }
    return { status: 'failed', errorMessage: applicantErr?.message ?? 'Insert failed' };
  }

  // Insert custom field values
  if (customValuePayloads.length > 0) {
    const rows = customValuePayloads.map((p) => ({
      applicant_id: newApplicant.id,
      field_id: p.field_id,
      value: p.value,
      raw_value: p.raw_value,
    }));
    const { error: valErr } = await supabase.from('recruitment_applicant_field_values').insert(rows);
    if (valErr) {
      console.error('field value insert failed:', valErr);
    }
  }

  // Create application if position mapped (skip if quarantine — the applicant
  // shouldn't enter the kanban until approved, but keeping the application row
  // is simpler; we filter via import_status downstream).
  if (positionId) {
    const { error: appErr } = await supabase.from('applications').insert({
      organization_id: organizationId,
      applicant_id: newApplicant.id,
      position_id: positionId,
      current_stage_id: opts.targetStageId ?? 'not_reviewed',
      applied_at: new Date().toISOString(),
    });
    if (appErr) console.error('Application insert failed:', appErr);
  }

  return { status: 'imported', applicantId: newApplicant.id };
}

/**
 * Load mappings + custom fields needed for ingestion.
 */
export async function loadIngestionContext(
  supabase: any,
  formMappingId: string,
): Promise<{
  fieldMappings: FormFieldMappingRow[];
  customFields: Map<string, CustomFieldRow>;
}> {
  const { data: mappings } = await supabase
    .from('recruitment_form_field_mappings')
    .select('*')
    .eq('form_mapping_id', formMappingId);

  const fieldMappings = (mappings ?? []) as FormFieldMappingRow[];
  const customFieldIds = fieldMappings
    .filter((m) => m.target_kind === 'custom' && m.target_custom_field_id)
    .map((m) => m.target_custom_field_id as string);

  const customFields = new Map<string, CustomFieldRow>();
  if (customFieldIds.length > 0) {
    const { data: fields } = await supabase
      .from('recruitment_custom_fields')
      .select('id, field_key, display_name, type_id, recruitment_custom_field_types ( type_key )')
      .in('id', customFieldIds);
    for (const f of (fields ?? [])) {
      const typeKey = (f as any).recruitment_custom_field_types?.type_key ?? 'text';
      customFields.set(f.id, {
        id: f.id,
        field_key: f.field_key,
        display_name: f.display_name,
        type_id: f.type_id,
        type_key: typeKey,
      });
    }
  }

  return { fieldMappings, customFields };
}
