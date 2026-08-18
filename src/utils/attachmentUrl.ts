import { supabase } from '@/integrations/supabase/client';

const FUNCTIONS_BASE = 'https://qgfaycwsangsqzpveoup.supabase.co/functions/v1';

/**
 * The get-attachment edge function requires an authenticated caller. Image tags
 * cannot send an Authorization header, so the access token is passed as a query
 * parameter. We keep a synchronous cache of the token so URL building stays sync.
 */
let cachedAccessToken: string | null = null;

supabase.auth.getSession().then(({ data }) => {
  cachedAccessToken = data.session?.access_token ?? null;
});

supabase.auth.onAuthStateChange((_event, session) => {
  cachedAccessToken = session?.access_token ?? null;
});

export function getCachedAccessToken(): string | null {
  return cachedAccessToken;
}

/** Builds an authenticated get-attachment URL. */
export function buildAttachmentUrl(params: Record<string, string>): string {
  const search = new URLSearchParams(params);
  if (cachedAccessToken) search.set('token', cachedAccessToken);
  return `${FUNCTIONS_BASE}/get-attachment?${search.toString()}`;
}
