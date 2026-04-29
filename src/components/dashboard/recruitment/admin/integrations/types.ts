export type MetaIntegrationStatus = 'configured' | 'connected' | 'disconnected' | 'error';

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
    can_fetch_forms: boolean;
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
  page_access_token: string | null;
  verify_token: string;
  status: MetaIntegrationStatus;
  status_message: string | null;
  last_event_at: string | null;
  last_health_check_at: string | null;
  last_health_check_result: MetaHealthCheckResult | null;
  token_expires_at: string | null;
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
