const FIELD_LABELS: Record<string, string> = {
  // applicants
  first_name: 'Fornavn',
  last_name: 'Etternavn',
  email: 'E-post',
  phone: 'Telefon',
  location: 'Sted',
  source: 'Kilde',
  drivers_license_classes: 'Førerkortklasser',
  years_experience: 'Års erfaring',
  certifications: 'Sertifiseringer',
  own_vehicle: 'Egen bil',
  availability_date: 'Tilgjengelig fra',
  language_norwegian: 'Norsk nivå',
  work_permit_status: 'Arbeidstillatelse',
  gdpr_consent: 'GDPR-samtykke',
  gdpr_consent_at: 'GDPR-samtykke tidspunkt',
  metadata: 'Metadata',
  source_details: 'Kildedetaljer',
  external_id: 'Ekstern ID',

  // applications
  current_stage_id: 'Trinn',
  assigned_to: 'Tildelt',
  applied_at: 'Søkte',
  status: 'Status',

  // applicant_notes
  content: 'Innhold',
  note_type: 'Notattype',

  // applicant_files
  file_name: 'Filnavn',
  file_type: 'Filtype',
  file_size: 'Filstørrelse',
  storage_path: 'Lagringssti',
  uploaded_by: 'Lastet opp av',

  // application_events
  event_type: 'Hendelsetype',
  event_data: 'Hendelsedata',
  performed_by: 'Utført av',

  // common system
  id: 'ID',
  created_at: 'Opprettet',
  updated_at: 'Oppdatert',
  organization_id: 'Organisasjon',
  applicant_id: 'Søker',
  application_id: 'Søknad',
  author_id: 'Forfatter',
};

export function fieldLabel(key: string): string {
  return FIELD_LABELS[key] ?? key;
}
