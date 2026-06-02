// Phase 12 — GDPR data collector.
// Pulls every row tied to an applicant across the recruitment schema so we can
// satisfy GDPR Article 15 (access) + Article 20 (portability) in a single
// machine-readable JSON document.
//
// Returns a typed structured object. The caller (fulfill-gdpr-export) bundles
// this as data.json inside the export ZIP, and the PDF builder consumes the
// same shape to render the human-readable report.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface CollectedFile {
  id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  storage_path: string | null;
  created_at: string;
}

export interface CollectedApplicantData {
  exported_at: string;
  organization_id: string;
  applicant: Record<string, unknown> | null;
  applications: Record<string, unknown>[];
  field_values: Record<string, unknown>[];
  custom_fields: Record<string, unknown>[];
  files: CollectedFile[];
  notes: Record<string, unknown>[];
  scoring_history: Record<string, unknown>[];
  scoring_queue: Record<string, unknown>[];
  candidate_form_tokens: Record<string, unknown>[];
  application_events: Record<string, unknown>[];
  audit_trail: Record<string, unknown>[];
  conversations: Record<string, unknown>[];
  messages: Record<string, unknown>[];
  tags: Record<string, unknown>[];
}

async function safeSelect<T>(
  promise: PromiseLike<{ data: T | null; error: { message: string } | null }>,
  label: string,
): Promise<T> {
  const { data, error } = await promise;
  if (error) {
    throw new Error(`gdprDataCollector[${label}]: ${error.message}`);
  }
  return (data ?? ([] as unknown as T));
}

export async function collectApplicantData(
  supabase: SupabaseClient,
  applicantId: string,
): Promise<CollectedApplicantData> {
  // Applicant row first — we need org_id + application ids for downstream queries.
  const { data: applicant, error: aErr } = await supabase
    .from("applicants")
    .select("*")
    .eq("id", applicantId)
    .maybeSingle();
  if (aErr) throw new Error(`gdprDataCollector[applicant]: ${aErr.message}`);
  if (!applicant) throw new Error(`Applicant ${applicantId} not found`);

  const orgId: string = applicant.organization_id;

  // Application ids — needed to scope scoring queue + score history.
  const { data: applications } = await supabase
    .from("applications")
    .select("*")
    .eq("applicant_id", applicantId);
  const applicationIds = (applications ?? []).map((a: any) => a.id);

  // Parallelize the rest.
  const [
    fieldValues,
    files,
    notes,
    scoringHistory,
    scoringQueue,
    formTokens,
    applicationEvents,
    auditTrail,
    conversations,
    tags,
  ] = await Promise.all([
    safeSelect<any[]>(
      supabase
        .from("recruitment_applicant_field_values")
        .select("*")
        .eq("applicant_id", applicantId) as any,
      "field_values",
    ),
    safeSelect<any[]>(
      supabase
        .from("applicant_files")
        .select("id,file_name,file_type,file_size,storage_path,created_at")
        .eq("applicant_id", applicantId) as any,
      "files",
    ),
    safeSelect<any[]>(
      supabase
        .from("applicant_notes")
        .select("*")
        .eq("applicant_id", applicantId) as any,
      "notes",
    ),
    applicationIds.length
      ? safeSelect<any[]>(
        supabase
          .from("applicant_score_history")
          .select("*")
          .in("application_id", applicationIds) as any,
        "scoring_history",
      )
      : Promise.resolve([]),
    applicationIds.length
      ? safeSelect<any[]>(
        supabase
          .from("application_scoring_queue")
          .select("*")
          .in("application_id", applicationIds) as any,
        "scoring_queue",
      )
      : Promise.resolve([]),
    safeSelect<any[]>(
      supabase
        .from("candidate_form_tokens")
        .select("*")
        .eq("applicant_id", applicantId) as any,
      "form_tokens",
    ),
    applicationIds.length
      ? safeSelect<any[]>(
        supabase
          .from("application_events")
          .select("*")
          .in("application_id", applicationIds) as any,
        "application_events",
      )
      : Promise.resolve([]),
    safeSelect<any[]>(
      supabase
        .from("recruitment_audit_events")
        .select("*")
        .eq("applicant_id", applicantId)
        .order("occurred_at", { ascending: true }) as any,
      "audit_trail",
    ),
    safeSelect<any[]>(
      supabase
        .from("applicant_conversations")
        .select("*")
        .eq("applicant_id", applicantId) as any,
      "conversations",
    ),
    safeSelect<any[]>(
      supabase
        .from("recruitment_applicant_tags")
        .select("*")
        .eq("applicant_id", applicantId) as any,
      "tags",
    ),
  ]);

  // Custom field definitions — needed for human-readable PDF labels.
  const fieldIds = Array.from(
    new Set((fieldValues ?? []).map((v: any) => v.field_id).filter(Boolean)),
  );
  const customFields = fieldIds.length
    ? await safeSelect<any[]>(
      supabase
        .from("recruitment_custom_fields")
        .select("id,field_key,display_name,description")
        .in("id", fieldIds) as any,
      "custom_fields",
    )
    : [];

  // Messages — joined through applicant_conversations.conversation_id.
  const conversationIds = (conversations ?? [])
    .map((c: any) => c.conversation_id)
    .filter(Boolean);
  const messages = conversationIds.length
    ? await safeSelect<any[]>(
      supabase
        .from("messages")
        .select(
          "id,conversation_id,sender_type,content,content_type,email_subject,email_message_id,sms_status,created_at",
        )
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: true }) as any,
      "messages",
    )
    : [];

  return {
    exported_at: new Date().toISOString(),
    organization_id: orgId,
    applicant,
    applications: applications ?? [],
    field_values: fieldValues ?? [],
    custom_fields: customFields ?? [],
    files: (files ?? []) as CollectedFile[],
    notes: notes ?? [],
    scoring_history: scoringHistory ?? [],
    scoring_queue: scoringQueue ?? [],
    candidate_form_tokens: formTokens ?? [],
    application_events: applicationEvents ?? [],
    audit_trail: auditTrail ?? [],
    conversations: conversations ?? [],
    messages: messages ?? [],
    tags: tags ?? [],
  };
}
