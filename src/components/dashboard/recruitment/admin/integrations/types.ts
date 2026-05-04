export type MetaIntegrationStatus =
  | 'configured'
  | 'connected'
  | 'disconnected'
  | 'error'
  | 'expiring_soon'
  | 'expiring_critical'
  | 'expired'
  | 'broken';

export type RecruitmentAdminAlertType =
  | 'token_expiring_soon'
  | 'token_expiring_critical'
  | 'token_expired'
  | 'integration_broken';

export interface RecruitmentAdminAlert {
  id: string;
  organization_id: string;
  integration_id: string | null;
  alert_type: RecruitmentAdminAlertType;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MetaHealthCheckResult {
  auth: {
    valid: boolean;
    is_page_token: boolean;
    page_id_match: boolean;
    owner_id: string | null;
    owner_name: string | null;
    scopes_present: string[];
    scopes_missing: string[];
    error?: string | null;
  };
  webhook: {
    subscription_active: boolean;
    last_event_at: string | null;
    events_24h: { success: number; failed: number; duplicate: number; invalid: number };
    error?: string | null;
  };
  lead_retrieval: {
    can_fetch_leads: boolean;
    last_success_at: string | null;
    last_error: string | null;
    tested_lead_id?: string | null;
  };
  subscription: { leadgen_subscribed: boolean };
  token_expires_at: string | null;
  overall_status: 'healthy' | 'degraded' | 'broken';
  status_message: string | null;
  checked_at: string;
}

export interface MetaTokenTestResult {
  valid: boolean;
  is_page_token: boolean;
  page_id_match: boolean;
  owner_id: string | null;
  owner_name: string | null;
  scopes_present: string[];
  scopes_missing: string[];
  error_summary: string | null;
}

export interface MetaIntegration {
  id: string;
  organization_id: string;
  page_id: string;
  page_name: string;
  // page_access_token is intentionally returned by select('*') today, but treat
  // as opaque server-only material — never display or log it client-side.
  page_access_token: string | null;
  verify_token: string;
  status: MetaIntegrationStatus;
  status_message: string | null;
  last_event_at: string | null;
  last_health_check_at: string | null;
  last_health_check_result: MetaHealthCheckResult | null;
  token_expires_at: string | null;
  // OAuth metadata. user_access_token is deliberately omitted — it lives in the
  // DB column for server-side use only and must never be referenced in frontend code.
  user_token_expires_at: string | null;
  connected_via: 'manual' | 'oauth' | null;
  oauth_user_id: string | null;
  oauth_user_name: string | null;
  deauthorized_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FormMapping {
  id: string;
  integration_id: string;
  organization_id: string;
  form_id: string;
  form_name: string | null;
  position_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type LeadIngestionStatus = 'success' | 'failed' | 'duplicate' | 'invalid';

export interface LeadIngestionLogEntry {
  id: string;
  organization_id: string;
  source: string;
  external_id: string | null;
  integration_id: string | null;
  status: LeadIngestionStatus;
  applicant_id: string | null;
  error_message: string | null;
  raw_payload: unknown;
  created_at: string;
  // enriched in-memory:
  applicant_name?: string | null;
}

// ─── Phase B3: field mapping + bulk import ───────────────────────

export type TargetKind = 'standard' | 'custom' | 'metadata_only';
export type StandardField = 'full_name' | 'email' | 'phone_number';
export type ApprovalMode = 'direct' | 'quarantine';
export type BulkImportStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
export type BulkImportLeadStatus = 'pending' | 'imported' | 'duplicate' | 'unmapped' | 'failed';

export interface CustomFieldType {
  id: string;
  type_key: string;
  display_name_en: string;
  display_name_no: string;
  supports_options: boolean;
  validation_schema: Record<string, unknown>;
  ui_component: string;
  created_at: string;
  updated_at: string;
}

export interface CustomField {
  id: string;
  organization_id: string;
  field_key: string;
  display_name: string;
  description: string | null;
  type_id: string;
  options: Array<{ value: string; label_no?: string; label_en?: string }> | null;
  validation_overrides: Record<string, unknown> | null;
  is_required: boolean;
  show_on_card: boolean;
  show_on_profile: boolean;
  display_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicantFieldValue {
  id: string;
  applicant_id: string;
  field_id: string;
  value: unknown;
  raw_value: string | null;
  created_at: string;
  updated_at: string;
}

export interface FieldMappingTemplate {
  id: string;
  organization_id: string | null;
  name: string;
  description: string | null;
  is_system: boolean;
  target_role_hint: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface FieldMappingTemplateItem {
  id: string;
  template_id: string;
  meta_question_pattern: string;
  target_kind: TargetKind;
  target_standard_field: StandardField | null;
  target_custom_field_key: string | null;
  target_custom_field_type_key: string | null;
  display_order: number;
  created_at: string;
}

export interface FormFieldMapping {
  id: string;
  form_mapping_id: string;
  meta_question_id: string;
  meta_question_key: string | null;
  meta_question_text: string;
  target_kind: TargetKind;
  target_standard_field: StandardField | null;
  target_custom_field_id: string | null;
  display_order: number;
  created_at: string;
}

export interface BulkImport {
  id: string;
  organization_id: string;
  integration_id: string;
  form_mapping_ids: string[];
  since_date: string;
  until_date: string;
  status: BulkImportStatus;
  approval_mode: ApprovalMode;
  imported_pipeline_stage_id: string | null;
  total_leads_found: number | null;
  total_leads_imported: number;
  total_leads_skipped_duplicate: number;
  total_leads_skipped_unmapped: number;
  total_leads_failed: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MetaFormQuestion {
  id?: string;
  key?: string;
  type?: string;
  label: string;
  options?: Array<{ key?: string; value?: string; label?: string }>;
}
