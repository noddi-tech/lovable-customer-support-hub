// Single source of truth for classifying automation action types as
// "external" (visible to the applicant — confirmation required) vs
// "internal" (staff-only, fires silently).
//
// Mirrors the SQL helper public.is_external_action_type. Keep the two
// in sync if either side changes.

export const EXTERNAL_ACTION_TYPES = new Set<string>([
  'send_email',
  'webhook',
  'send_sms',
]);

export function isExternalAction(actionType: string | null | undefined): boolean {
  if (!actionType) return false;
  return EXTERNAL_ACTION_TYPES.has(actionType);
}
