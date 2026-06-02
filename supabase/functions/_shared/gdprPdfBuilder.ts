// Phase 12 — GDPR Article 15+20 PDF report builder.
//
// Generates a human-readable Norwegian PDF summarizing all data we hold on a
// candidate. Uses pdf-lib (Deno-compatible, no native deps, pure JS) and
// embeds the standard 14 fonts (no font files needed).
//
// Pagination is automatic: when the cursor approaches the bottom margin we
// add a new page. All section data is reflected from CollectedApplicantData.

import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import type { CollectedApplicantData } from "./gdprDataCollector.ts";

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN = 50;
const LINE = 14;
const HEADING_GAP = 18;
const SECTION_GAP = 24;

interface Cursor {
  pdf: PDFDocument;
  page: PDFPage;
  font: PDFFont;
  bold: PDFFont;
  y: number;
}

function newPage(c: Cursor): void {
  c.page = c.pdf.addPage([PAGE_W, PAGE_H]);
  c.y = PAGE_H - MARGIN;
}

function ensureSpace(c: Cursor, needed: number): void {
  if (c.y - needed < MARGIN) newPage(c);
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("nb-NO", {
      timeZone: "Europe/Oslo",
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return String(iso);
  }
}

function sanitize(s: unknown): string {
  if (s === null || s === undefined) return "";
  return String(s)
    // pdf-lib's WinAnsi-encoded standard fonts can't render most non-Latin-1
    // glyphs. Strip them to avoid encode errors. Norwegian æøåÆØÅ are within
    // WinAnsi so they survive.
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\u00FF]/g, "?")
    .slice(0, 5000);
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = sanitize(text).split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const candidate = current ? `${current} ${w}` : w;
    if (font.widthOfTextAtSize(candidate, size) > maxWidth && current) {
      lines.push(current);
      current = w;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawLine(c: Cursor, text: string, opts: { bold?: boolean; size?: number; indent?: number } = {}): void {
  const size = opts.size ?? 10;
  const font = opts.bold ? c.bold : c.font;
  const indent = opts.indent ?? 0;
  const maxWidth = PAGE_W - MARGIN * 2 - indent;
  const lines = wrapText(text, font, size, maxWidth);
  for (const line of lines) {
    ensureSpace(c, LINE);
    c.page.drawText(line, {
      x: MARGIN + indent,
      y: c.y,
      size,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    c.y -= LINE;
  }
}

function drawSectionHeading(c: Cursor, title: string): void {
  ensureSpace(c, HEADING_GAP + LINE);
  c.y -= SECTION_GAP - LINE;
  c.page.drawText(sanitize(title), {
    x: MARGIN,
    y: c.y,
    size: 14,
    font: c.bold,
    color: rgb(0, 0, 0),
  });
  c.y -= LINE;
  c.page.drawLine({
    start: { x: MARGIN, y: c.y + 4 },
    end: { x: PAGE_W - MARGIN, y: c.y + 4 },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });
  c.y -= 8;
}

function drawKeyValue(c: Cursor, key: string, value: string): void {
  ensureSpace(c, LINE);
  c.page.drawText(sanitize(key) + ":", {
    x: MARGIN,
    y: c.y,
    size: 10,
    font: c.bold,
    color: rgb(0.2, 0.2, 0.2),
  });
  const keyW = c.bold.widthOfTextAtSize(sanitize(key) + ": ", 10);
  const valueText = sanitize(value || "-");
  const maxW = PAGE_W - MARGIN * 2 - keyW;
  const lines = wrapText(valueText, c.font, 10, maxW);
  if (lines.length === 0) {
    c.y -= LINE;
    return;
  }
  c.page.drawText(lines[0], {
    x: MARGIN + keyW,
    y: c.y,
    size: 10,
    font: c.font,
    color: rgb(0.1, 0.1, 0.1),
  });
  c.y -= LINE;
  for (let i = 1; i < lines.length; i++) {
    ensureSpace(c, LINE);
    c.page.drawText(lines[i], {
      x: MARGIN + keyW,
      y: c.y,
      size: 10,
      font: c.font,
      color: rgb(0.1, 0.1, 0.1),
    });
    c.y -= LINE;
  }
}

export async function buildGdprPdf(
  data: CollectedApplicantData,
  meta: { requestId: string; organizationName?: string },
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const c: Cursor = { pdf, page: pdf.addPage([PAGE_W, PAGE_H]), font, bold, y: PAGE_H - MARGIN };

  const applicant = (data.applicant ?? {}) as Record<string, any>;
  const fullName = `${applicant.first_name ?? ""} ${applicant.last_name ?? ""}`.trim() || "(uten navn)";

  // ---- Title ----
  c.page.drawText("GDPR-eksport av kandidatdata", {
    x: MARGIN,
    y: c.y,
    size: 18,
    font: bold,
    color: rgb(0, 0, 0),
  });
  c.y -= 22;
  c.page.drawText(`Kandidat: ${sanitize(fullName)}`, {
    x: MARGIN,
    y: c.y,
    size: 11,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });
  c.y -= LINE;
  c.page.drawText(`Eksportert: ${fmtDate(data.exported_at)}`, {
    x: MARGIN,
    y: c.y,
    size: 10,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  c.y -= LINE;
  c.page.drawText(`Forespørsel: ${sanitize(meta.requestId)}`, {
    x: MARGIN,
    y: c.y,
    size: 10,
    font,
    color: rgb(0.4, 0.4, 0.4),
  });
  c.y -= LINE;

  // ---- Personlig informasjon ----
  drawSectionHeading(c, "Personlig informasjon");
  drawKeyValue(c, "Navn", fullName);
  drawKeyValue(c, "E-post", applicant.email ?? "");
  drawKeyValue(c, "Telefon", applicant.phone ?? "");
  drawKeyValue(c, "Sted", applicant.location ?? "");
  drawKeyValue(c, "Kilde", applicant.source ?? "");
  drawKeyValue(c, "Registrert", fmtDate(applicant.created_at));
  drawKeyValue(c, "GDPR-samtykke", applicant.gdpr_consent ? `Ja (${fmtDate(applicant.gdpr_consent_at)})` : "Nei");
  if (applicant.anonymized_at) {
    drawKeyValue(c, "Anonymisert", fmtDate(applicant.anonymized_at));
  }

  // ---- Søknader ----
  drawSectionHeading(c, `Søknader (${data.applications.length})`);
  for (const app of data.applications as any[]) {
    drawLine(c, `• Søknad ${sanitize(app.id)}`, { bold: true });
    drawKeyValue(c, "  Status", app.status ?? app.stage_id ?? "");
    drawKeyValue(c, "  Pipeline", app.pipeline_id ?? "");
    drawKeyValue(c, "  Opprettet", fmtDate(app.created_at));
    if (app.ai_score !== null && app.ai_score !== undefined) {
      drawKeyValue(c, "  AI-score", String(app.ai_score));
    }
  }

  // ---- Skjemafelter ----
  const fieldMap = new Map<string, any>();
  for (const f of data.custom_fields as any[]) fieldMap.set(f.id, f);
  drawSectionHeading(c, `Skjemafelter (${data.field_values.length})`);
  for (const v of data.field_values as any[]) {
    const fieldDef = fieldMap.get(v.field_id);
    const label = fieldDef?.display_name ?? fieldDef?.field_key ?? v.field_id;
    const valueStr = v.raw_value ?? (v.value !== null ? JSON.stringify(v.value) : "");
    drawKeyValue(c, label, valueStr);
  }

  // ---- Vurderinger ----
  drawSectionHeading(c, `AI-vurderinger (${data.scoring_history.length})`);
  for (const s of data.scoring_history as any[]) {
    drawLine(c, `${fmtDate(s.created_at)} — Score: ${s.score ?? "-"} (modell: ${s.model ?? "-"})`, { bold: true });
    if (s.explanation) drawLine(c, sanitize(s.explanation), { indent: 12 });
  }

  // ---- Tidslinje ----
  drawSectionHeading(c, `Tidslinje / audit (${data.audit_trail.length} hendelser)`);
  for (const e of data.audit_trail as any[]) {
    drawLine(
      c,
      `${fmtDate(e.occurred_at)} — ${e.event_type ?? ""} ${e.description ? "— " + e.description : ""}`,
    );
  }

  // ---- Kommunikasjon ----
  drawSectionHeading(c, `Kommunikasjon (${data.messages.length} meldinger)`);
  for (const m of data.messages as any[]) {
    const subject = m.email_subject ? ` — ${m.email_subject}` : "";
    drawLine(
      c,
      `${fmtDate(m.created_at)} [${m.sender_type ?? "?"}]${subject}`,
      { bold: true },
    );
    if (m.content) {
      const preview = String(m.content).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300);
      if (preview) drawLine(c, preview, { indent: 12 });
    }
  }

  // ---- Filer ----
  drawSectionHeading(c, `Filer (${data.files.length})`);
  for (const f of data.files) {
    drawLine(
      c,
      `• ${f.file_name ?? "(uten navn)"} — ${f.file_type ?? "?"} — ${f.file_size ?? 0} bytes — ${fmtDate(f.created_at)}`,
    );
  }

  // ---- Notater ----
  drawSectionHeading(c, `Rekrutteringsnotater (${data.notes.length})`);
  for (const n of data.notes as any[]) {
    drawLine(c, `${fmtDate(n.created_at)}`, { bold: true });
    if (n.content) drawLine(c, sanitize(n.content), { indent: 12 });
  }

  // ---- Footer on last page ----
  ensureSpace(c, 40);
  c.y -= 12;
  c.page.drawLine({
    start: { x: MARGIN, y: c.y },
    end: { x: PAGE_W - MARGIN, y: c.y },
    thickness: 0.5,
    color: rgb(0.7, 0.7, 0.7),
  });
  c.y -= LINE;
  c.page.drawText(
    `Generert ${fmtDate(data.exported_at)} for GDPR-forespørsel ${meta.requestId}`,
    { x: MARGIN, y: c.y, size: 8, font, color: rgb(0.5, 0.5, 0.5) },
  );

  return await pdf.save();
}
