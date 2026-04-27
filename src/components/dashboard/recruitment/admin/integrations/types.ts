export type MetaIntegrationStatus = 'configured' | 'connected' | 'disconnected' | 'error';

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
