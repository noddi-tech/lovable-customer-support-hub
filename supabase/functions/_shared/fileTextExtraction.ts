// PDF + DOCX text extraction for applicant files.
// PDF: pdfjs-dist (legacy build, Deno-compatible)
// DOCX: mammoth

import mammoth from 'npm:mammoth@1.8.0';

export type ExtractionResult = { text: string } | { error: string };

const MAX_TEXT_CHARS = 80_000; // ~20k tokens

function truncate(s: string): string {
  if (!s) return '';
  return s.length <= MAX_TEXT_CHARS ? s : s.slice(0, MAX_TEXT_CHARS) + '\n…[truncated]';
}

export async function extractText(filename: string, bytes: Uint8Array): Promise<ExtractionResult> {
  const lower = filename.toLowerCase();
  try {
    if (lower.endsWith('.pdf')) {
      return { text: truncate(await extractPdf(bytes)) };
    }
    if (lower.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer: bytes as unknown as Buffer });
      return { text: truncate(result.value || '') };
    }
    if (lower.endsWith('.txt') || lower.endsWith('.md')) {
      return { text: truncate(new TextDecoder().decode(bytes)) };
    }
    return { error: `Unsupported file type for extraction: ${filename}` };
  } catch (err: any) {
    return { error: err?.message || 'Extraction failed' };
  }
}

async function extractPdf(bytes: Uint8Array): Promise<string> {
  // Dynamic import keeps cold-start small for non-PDF jobs
  const pdfjs = await import('npm:pdfjs-dist@4.0.379/legacy/build/pdf.mjs');
  // Disable worker for Deno
  (pdfjs as any).GlobalWorkerOptions.workerSrc = '';
  const loadingTask = (pdfjs as any).getDocument({
    data: bytes,
    disableWorker: true,
    isEvalSupported: false,
    useSystemFonts: false,
  });
  const pdf = await loadingTask.promise;
  const parts: string[] = [];
  const maxPages = Math.min(pdf.numPages, 30);
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const txt = content.items.map((it: any) => ('str' in it ? it.str : '')).join(' ');
    parts.push(txt);
    if (parts.join('\n').length >= MAX_TEXT_CHARS) break;
  }
  return parts.join('\n\n');
}
