import type { EventSource, UnifiedAuditEvent } from './types';

export const SOURCE_LABELS: Record<EventSource, string> = {
  audit: 'Revisjon',
  automation: 'Automatisering',
  ingestion: 'Innhenting',
};

export const SOURCE_BADGE_VARIANT: Record<EventSource, 'default' | 'secondary' | 'outline'> = {
  audit: 'default',
  automation: 'secondary',
  ingestion: 'outline',
};

const EVENT_LABELS: Record<string, string> = {
  applicants_created: 'Søker opprettet',
  applicants_updated: 'Søker oppdatert',
  applicants_deleted: 'Søker slettet',
  applications_created: 'Søknad opprettet',
  applications_updated: 'Søknad oppdatert',
  applications_deleted: 'Søknad slettet',
  application_stage_changed: 'Trinn endret',
  applicant_notes_created: 'Notat opprettet',
  applicant_notes_updated: 'Notat oppdatert',
  applicant_notes_deleted: 'Notat slettet',
  applicant_files_created: 'Fil lastet opp',
  applicant_files_deleted: 'Fil slettet',
  application_events_created: 'Hendelse loggført',
  applicant_exported: 'Søker eksportert',
  applicants_bulk_exported: 'Bulkeksport',
  ingestion_success: 'Innhenting fullført',
  ingestion_failed: 'Innhenting feilet',
  ingestion_duplicate: 'Duplikat oppdaget',
};

export function eventLabel(eventType: string): string {
  return EVENT_LABELS[eventType] ?? eventType;
}

export function summarizeChange(ev: UnifiedAuditEvent): string {
  if (ev.event_category === 'export') {
    const ctx = ev.context as any;
    return `${ctx?.format?.toUpperCase() ?? ''} eksport (${ctx?.count ?? 0} hendelser)`;
  }
  if (ev.new_values && ev.old_values) {
    const keys = Object.keys(ev.new_values).slice(0, 3);
    return keys.length ? `Endret: ${keys.join(', ')}` : '';
  }
  if (ev.new_values) return 'Opprettet';
  if (ev.old_values) return 'Slettet';
  return ev.description ?? '';
}

export function formatRetention(days: number): string {
  if (days >= 365) {
    const years = Math.round((days / 365) * 10) / 10;
    return `${years} år`;
  }
  if (days >= 30) {
    const months = Math.round((days / 30) * 10) / 10;
    return `${months} måneder`;
  }
  return `${days} dager`;
}
