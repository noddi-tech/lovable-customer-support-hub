// Phase 12 — GDPR ZIP bundler.
//
// Assembles the export ZIP in memory using fflate (Deno-compatible, sync API,
// pure JS — no native deps, no streaming complexity for an applicant's
// typically-small dataset).
//
// Layout produced:
//   manifest.json       — export metadata
//   data.json           — full structured export (CollectedApplicantData)
//   report.pdf          — human-readable PDF
//   files/<file_name>   — original applicant uploads (one per file)

import { zipSync, strToU8 } from "https://esm.sh/fflate@0.8.2";

export interface ZipFileEntry {
  name: string;
  data: Uint8Array;
}

export interface ZipBundleInput {
  manifest: Record<string, unknown>;
  dataJson: unknown;
  reportPdf: Uint8Array;
  files: ZipFileEntry[];
}

// Make a filesystem-safe filename; preserve the extension if any.
function safeName(name: string, fallback: string): string {
  const cleaned = (name || fallback)
    .replace(/[\/\\]/g, "_")
    .replace(/[^A-Za-z0-9._\- \u00C0-\u017F]/g, "_")
    .slice(0, 200);
  return cleaned || fallback;
}

export function buildGdprZip(input: ZipBundleInput): Uint8Array {
  const tree: Record<string, Uint8Array> = {
    "manifest.json": strToU8(JSON.stringify(input.manifest, null, 2)),
    "data.json": strToU8(JSON.stringify(input.dataJson, null, 2)),
    "report.pdf": input.reportPdf,
  };

  // De-duplicate file names so collisions don't overwrite each other.
  const used = new Set<string>();
  input.files.forEach((f, idx) => {
    let name = safeName(f.name, `file_${idx + 1}`);
    if (used.has(name)) {
      const dot = name.lastIndexOf(".");
      const stem = dot > 0 ? name.slice(0, dot) : name;
      const ext = dot > 0 ? name.slice(dot) : "";
      name = `${stem}_${idx + 1}${ext}`;
    }
    used.add(name);
    tree[`files/${name}`] = f.data;
  });

  return zipSync(tree, { level: 6 });
}
