// Phase B4: Scheduled Meta token health check.
// Iterates active recruitment_meta_integrations rows, calls debug_token on each
// page access token, updates status + expiry, and creates admin alerts on
// degradation transitions. Resolves prior unresolved alerts when status
// recovers to 'connected'.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GRAPH = 'https://graph.facebook.com/v19.0';
const REQUIRED_SCOPES = [
  'leads_retrieval',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_metadata',
];

type TokenStatus =
  | 'connected'
  | 'expiring_soon'
  | 'expiring_critical'
  | 'expired'
  | 'broken';

function classify(isValid: boolean, expiresAt: number, scopes: string[]): {
  status: TokenStatus;
  message: string | null;
  missing: string[];
  daysLeft: number | null;
} {
  const missing = REQUIRED_SCOPES.filter((s) => !scopes.includes(s));
  if (!isValid) return { status: 'expired', message: 'Tokenet er utløpt eller ugyldig.', missing, daysLeft: null };
  if (missing.length > 0) return { status: 'broken', message: `Mangler tilganger: ${missing.join(', ')}`, missing, daysLeft: null };
  if (expiresAt === 0) return { status: 'connected', message: null, missing, daysLeft: null };
  const days = (expiresAt * 1000 - Date.now()) / 86_400_000;
  if (days < 7) return { status: 'expiring_critical', message: `Tokenet utløper om ${Math.max(0, Math.floor(days))} dager.`, missing, daysLeft: days };
  if (days < 30) return { status: 'expiring_soon', message: `Tokenet utløper om ${Math.floor(days)} dager.`, missing, daysLeft: days };
  return { status: 'connected', message: null, missing, daysLeft: days };
}

function alertTypeFor(status: TokenStatus): string | null {
  switch (status) {
    case 'expiring_soon': return 'token_expiring_soon';
    case 'expiring_critical': return 'token_expiring_critical';
    case 'expired': return 'token_expired';
    case 'broken': return 'integration_broken';
    default: return null;
  }
}

function severityFor(status: TokenStatus): 'info' | 'warning' | 'critical' {
  if (status === 'expired' || status === 'broken' || status === 'expiring_critical') return 'critical';
  if (status === 'expiring_soon') return 'warning';
  return 'info';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
  const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const META_APP_ID = Deno.env.get('META_APP_ID');
  const META_APP_SECRET = Deno.env.get('META_APP_SECRET');
  if (!META_APP_ID || !META_APP_SECRET) {
    return new Response(JSON.stringify({ error: 'Missing Meta secrets' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE);
  const appToken = `${META_APP_ID}|${META_APP_SECRET}`;

  const { data: integrations, error } = await admin
    .from('recruitment_meta_integrations')
    .select('id, organization_id, page_id, page_name, page_access_token, status')
    .neq('status', 'disconnected');

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let checked = 0;
  let transitioned = 0;
  let alertsCreated = 0;

  for (const integ of integrations ?? []) {
    if (!integ.page_access_token) continue;
    checked++;

    let cls: ReturnType<typeof classify>;
    try {
      const r = await fetch(
        `${GRAPH}/debug_token?input_token=${encodeURIComponent(integ.page_access_token)}` +
        `&access_token=${encodeURIComponent(appToken)}`,
      );
      const d = await r.json().catch(() => ({}));
      const info = d?.data ?? {};
      cls = classify(!!info?.is_valid, typeof info?.expires_at === 'number' ? info.expires_at : 0, Array.isArray(info?.scopes) ? info.scopes : []);
    } catch {
      cls = { status: 'expired', message: 'Kunne ikke kontakte Meta debug_token.', missing: [], daysLeft: null };
    }

    const expiresAtIso = cls.daysLeft === null && cls.status === 'connected'
      ? 'infinity'
      : (cls.daysLeft !== null
          ? new Date(Date.now() + cls.daysLeft * 86_400_000).toISOString()
          : null);

    const update: Record<string, unknown> = {
      status: cls.status,
      status_message: cls.message,
      last_health_check_at: new Date().toISOString(),
    };
    if (expiresAtIso !== null) {
      update.user_token_expires_at = expiresAtIso;
      update.token_expires_at = expiresAtIso;
    }

    await admin.from('recruitment_meta_integrations').update(update).eq('id', integ.id);

    const prev = integ.status as TokenStatus | string;
    if (prev !== cls.status) transitioned++;

    // If we recovered to connected, resolve any unresolved alerts for this integration
    if (cls.status === 'connected') {
      await admin
        .from('recruitment_admin_alerts')
        .update({ resolved_at: new Date().toISOString() })
        .eq('integration_id', integ.id)
        .is('resolved_at', null);
      continue;
    }

    const alertType = alertTypeFor(cls.status);
    if (!alertType) continue;

    // Skip if there's already an unresolved alert of the same type
    const { data: existing } = await admin
      .from('recruitment_admin_alerts')
      .select('id')
      .eq('integration_id', integ.id)
      .eq('alert_type', alertType)
      .is('resolved_at', null)
      .limit(1)
      .maybeSingle();
    if (existing) continue;

    await admin.from('recruitment_admin_alerts').insert({
      organization_id: integ.organization_id,
      integration_id: integ.id,
      alert_type: alertType,
      severity: severityFor(cls.status),
      message: `${integ.page_name}: ${cls.message ?? cls.status}`,
    });
    alertsCreated++;
  }

  return new Response(
    JSON.stringify({ checked, transitioned, alerts_created: alertsCreated }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
