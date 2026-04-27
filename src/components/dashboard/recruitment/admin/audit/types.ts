export type EventSource = 'audit' | 'automation' | 'ingestion';
export type EventCategory = 'write' | 'export' | 'auth' | 'system';

export interface UnifiedAuditEvent {
  id: string;
  occurred_at: string;
  source: EventSource;
  event_type: string;
  event_category?: EventCategory;
  subject_table?: string | null;
  subject_id?: string | null;
  applicant_id?: string | null;
  actor_profile_id?: string | null;
  actor_name?: string | null;
  description: string;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
  context?: Record<string, unknown> | null;
  raw?: any;
}

export interface AuditEventFilters {
  from?: string;
  to?: string;
  eventTypes?: string[];
  sources?: EventSource[];
  actorProfileId?: string;
}
