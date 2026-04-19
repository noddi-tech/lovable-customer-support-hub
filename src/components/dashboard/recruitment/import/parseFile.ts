import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export type TargetField =
  | 'ignore'
  | 'first_name'
  | 'last_name'
  | 'full_name'
  | 'email'
  | 'phone'
  | 'location'
  | 'drivers_license_classes'
  | 'years_experience'
  | 'note'
  | 'metadata';

export const TARGET_FIELD_LABELS: Record<TargetField, string> = {
  ignore: 'Ignorer',
  first_name: 'Fornavn (first_name)',
  last_name: 'Etternavn (last_name)',
  full_name: 'Fullt navn (deles automatisk)',
  email: 'E-post (email)',
  phone: 'Telefon (phone)',
  location: 'Sted (location)',
  drivers_license_classes: 'Førerkortklasser (komma-separert)',
  years_experience: 'Års erfaring',
  note: 'Notat/beskrivelse',
  metadata: 'Lagre i metadata',
};

export interface ParsedFile {
  headers: string[];
  rows: Record<string, string>[];
}

export async function parseCsv(file: File): Promise<ParsedFile> {
  const text = await file.text();
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        const headers = results.meta.fields ?? [];
        const rows = (results.data ?? []).filter((r) =>
          Object.values(r).some((v) => v != null && String(v).trim() !== '')
        );
        resolve({ headers, rows });
      },
      error: (err) => reject(err),
    });
  });
}

export async function parseXlsx(file: File): Promise<ParsedFile> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
    defval: '',
    raw: false,
  });
  const headers = json.length > 0 ? Object.keys(json[0]).map((h) => h.trim()) : [];
  const rows = json
    .map((r) => {
      const out: Record<string, string> = {};
      for (const k of Object.keys(r)) {
        out[k.trim()] = r[k] == null ? '' : String(r[k]);
      }
      return out;
    })
    .filter((r) => Object.values(r).some((v) => v.trim() !== ''));
  return { headers, rows };
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) return parseXlsx(file);
  return parseCsv(file);
}

export function autoDetectMapping(headers: string[]): Record<string, TargetField> {
  const mapping: Record<string, TargetField> = {};
  for (const h of headers) {
    const k = h.toLowerCase().trim();
    if (/^(full[\s_]?name|fullt navn|navn)$/.test(k)) mapping[h] = 'full_name';
    else if (/^(first[\s_]?name|fornavn)$/.test(k)) mapping[h] = 'first_name';
    else if (/^(last[\s_]?name|etternavn|surname)$/.test(k)) mapping[h] = 'last_name';
    else if (/^(e[-_]?mail|e-post|epost)$/.test(k)) mapping[h] = 'email';
    else if (/^(phone[\s_]?number|phone|telefon|mobile|mobil|tlf)$/.test(k))
      mapping[h] = 'phone';
    else if (/^(city|sted|location|by|poststed)$/.test(k)) mapping[h] = 'location';
    else if (/(driver|førerkort|sertifikat)/.test(k)) mapping[h] = 'drivers_license_classes';
    else if (/(experience|erfaring)/.test(k)) mapping[h] = 'years_experience';
    else if (/(note|notat|beskrivelse|comment|kommentar)/.test(k)) mapping[h] = 'note';
    else mapping[h] = 'metadata';
  }
  return mapping;
}

export function splitFullName(full: string): { first_name: string; last_name: string } {
  const trimmed = (full ?? '').trim();
  if (!trimmed) return { first_name: '', last_name: '' };
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return { first_name: parts[0], last_name: '' };
  return { first_name: parts[0], last_name: parts.slice(1).join(' ') };
}

export interface MappedApplicant {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  location: string | null;
  drivers_license_classes: string[];
  years_experience: number | null;
  note: string;
  metadata: Record<string, string>;
}

export function mapRow(
  row: Record<string, string>,
  mapping: Record<string, TargetField>
): MappedApplicant {
  const out: MappedApplicant = {
    first_name: '',
    last_name: '',
    email: '',
    phone: null,
    location: null,
    drivers_license_classes: [],
    years_experience: null,
    note: '',
    metadata: {},
  };

  for (const [header, target] of Object.entries(mapping)) {
    const raw = (row[header] ?? '').toString().trim();
    if (!raw || target === 'ignore') continue;

    switch (target) {
      case 'full_name': {
        const split = splitFullName(raw);
        if (!out.first_name) out.first_name = split.first_name;
        if (!out.last_name) out.last_name = split.last_name;
        break;
      }
      case 'first_name':
        out.first_name = raw;
        break;
      case 'last_name':
        out.last_name = raw;
        break;
      case 'email':
        out.email = raw.toLowerCase();
        break;
      case 'phone':
        out.phone = raw;
        break;
      case 'location':
        out.location = raw;
        break;
      case 'drivers_license_classes':
        out.drivers_license_classes = raw
          .split(',')
          .map((s) => s.trim().toUpperCase())
          .filter(Boolean);
        break;
      case 'years_experience': {
        const n = parseInt(raw, 10);
        out.years_experience = Number.isNaN(n) ? null : n;
        break;
      }
      case 'note':
        out.note = raw;
        break;
      case 'metadata':
        out.metadata[header] = raw;
        break;
    }
  }

  return out;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
