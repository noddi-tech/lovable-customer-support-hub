// Phase 12 — GDPR Article 17 erasure helper.
//
// The atomic anonymization happens server-side in the SECURITY DEFINER
// function `public.gdpr_erase_applicant`. This wrapper:
//   1. Invokes the RPC (single Postgres transaction; rolls back fully on any
//      step failure).
//   2. Deletes the storage objects the RPC returns (best-effort; the daily
//      cleanup cron sweeps any leftovers).
//   3. Returns a structured summary suitable for gdpr_requests.fulfillment_summary.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

const APPLICANT_FILES_BUCKET = "applicant-files";

export interface AnonymizationSummary {
  already_anonymized: boolean;
  tables_affected: { table: string; rows: number }[];
  files_deleted: number;
  files_failed: number;
  failed_paths: string[];
}

export async function anonymizeApplicant(
  supabase: SupabaseClient,
  applicantId: string,
  requestId: string,
): Promise<AnonymizationSummary> {
  const { data, error } = await supabase.rpc("gdpr_erase_applicant", {
    p_applicant_id: applicantId,
    p_request_id: requestId,
  });
  if (error) {
    throw new Error(`gdpr_erase_applicant RPC failed: ${error.message}`);
  }
  const summary = (data ?? {}) as {
    already_anonymized: boolean;
    tables_affected: { table: string; rows: number }[];
    file_paths: string[];
  };

  let filesDeleted = 0;
  let filesFailed = 0;
  const failedPaths: string[] = [];

  const paths = (summary.file_paths ?? []).filter((p) => typeof p === "string" && p.length > 0);
  if (paths.length > 0) {
    // Batch in chunks of 100 (Supabase storage remove() accepts an array but
    // we keep batch size small for visibility on partial failure).
    const chunkSize = 100;
    for (let i = 0; i < paths.length; i += chunkSize) {
      const chunk = paths.slice(i, i + chunkSize);
      const { data: removed, error: rmErr } = await supabase.storage
        .from(APPLICANT_FILES_BUCKET)
        .remove(chunk);
      if (rmErr) {
        filesFailed += chunk.length;
        failedPaths.push(...chunk);
        console.error(
          `[gdprAnonymizer] storage.remove failed for ${chunk.length} files: ${rmErr.message}`,
        );
      } else {
        filesDeleted += removed?.length ?? 0;
        const removedSet = new Set((removed ?? []).map((r: any) => r.name));
        const missed = chunk.filter((p) => !removedSet.has(p));
        if (missed.length) {
          // Object didn't exist or was already gone — count as deleted-equivalent,
          // but log for visibility.
          console.warn(
            `[gdprAnonymizer] ${missed.length} files were already absent from bucket`,
          );
        }
      }
    }
  }

  return {
    already_anonymized: summary.already_anonymized,
    tables_affected: summary.tables_affected ?? [],
    files_deleted: filesDeleted,
    files_failed: filesFailed,
    failed_paths: failedPaths,
  };
}
