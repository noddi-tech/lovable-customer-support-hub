import type { Json } from '@/integrations/supabase/types';
import type { TriggerType } from '../types';

export type DryRunTriggerType = TriggerType;

export interface DryRunRequest {
  triggerType: DryRunTriggerType;
  applicantId: string;
  stageId: string | null;
}

export interface DryRunActionResult {
  action_type?: string;
  status?: string;
  success?: boolean;
  duration_ms?: number | null;
  error?: string | null;
  error_message?: string | null;
  recipient?: string | null;
  recipient_email?: string | null;
  template_name?: string | null;
  template_id?: string | null;
  assigned_to?: string | null;
  assigned_to_name?: string | null;
  profile_name?: string | null;
  url?: string | null;
  method?: string | null;
  http_method?: string | null;
}

export interface DryRunResult {
  rule_id: string;
  rule_name: string;
  overall_status: string;
  action_results: Json;
  duration_ms: number;
  execution_id: string;
}

export interface ApplicantSearchResult {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  current_stage_id: string | null;
  current_stage_name: string | null;
  current_stage_color: string | null;
}

export interface StageOption {
  id: string;
  name: string;
  color: string | null;
  order_index: number;
}

export function getApplicantDisplayName(applicant: Pick<ApplicantSearchResult, 'first_name' | 'last_name' | 'email'>) {
  const fullName = `${applicant.first_name ?? ''} ${applicant.last_name ?? ''}`.trim();
  return fullName || applicant.email || 'Ukjent søker';
}
