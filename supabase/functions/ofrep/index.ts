// OpenFeature Remote Evaluation Protocol (OFREP) endpoint backed by public.feature_flags.
//
//   POST /ofrep/v1/evaluate/flags        -> bulk evaluation
//   POST /ofrep/v1/evaluate/flags/{key}  -> single flag evaluation
//   GET  /ofrep/v1/configuration         -> minimal capabilities document
//
// Authenticate with a Supabase user JWT (Authorization: Bearer <token>).
// Evaluation is scoped to the caller's organization; global flags act as defaults.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

type Targeting = {
  onVariant?: string;
  rules?: { contextKey: string; op: 'eq' | 'in' | 'contains'; value: unknown; variant: string }[];
};

interface FlagRow {
  key: string;
  organization_id: string | null;
  enabled: boolean;
  value_type: string;
  variants: Record<string, unknown>;
  default_variant: string;
  targeting: Targeting;
  updated_at: string;
}

function matches(
  rule: NonNullable<Targeting['rules']>[number],
  context: Record<string, unknown>,
): boolean {
  const actual = context[rule.contextKey];
  if (rule.op === 'eq') return actual === rule.value;
  if (rule.op === 'in') return Array.isArray(rule.value) && rule.value.includes(actual);
  if (rule.op === 'contains') {
    return typeof actual === 'string' && typeof rule.value === 'string'
      ? actual.includes(rule.value)
      : false;
  }
  return false;
}

function evaluate(flag: FlagRow, context: Record<string, unknown>) {
  const variants = flag.variants ?? {};
  const serve = (variant: string, reason: string) => {
    if (!(variant in variants)) {
      return {
        key: flag.key,
        reason: 'ERROR',
        errorCode: 'GENERAL',
        errorDetails: `Unknown variant "${variant}"`,
      };
    }
    return { key: flag.key, value: variants[variant], variant, reason, metadata: { valueType: flag.value_type } };
  };

  if (!flag.enabled) return serve(flag.default_variant || 'off', 'DISABLED');

  for (const rule of flag.targeting?.rules ?? []) {
    if (matches(rule, context)) return serve(rule.variant, 'TARGETING_MATCH');
  }

  const onVariant = flag.targeting?.onVariant || ('on' in variants ? 'on' : flag.default_variant);
  return serve(onVariant, 'STATIC');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  // Strip the function name so both /ofrep/... and bare /... routes work.
  const path = url.pathname.replace(/^\/functions\/v1/, '').replace(/^\/ofrep(?=\/|$)/, '');

  if (req.method === 'GET' && path.startsWith('/ofrep/v1/configuration')) {
    return json({ name: 'support-hub-ofrep', capabilities: { cacheInvalidation: { polling: { enabled: true, minPollingIntervalMs: 30000 } }, flagEvaluation: { supportedTypes: ['boolean', 'string', 'number', 'object'] } } });
  }

  if (req.method !== 'POST' || !path.startsWith('/ofrep/v1/evaluate/flags')) {
    return json({ errorCode: 'GENERAL', errorDetails: 'Not found' }, 404);
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return json({ errorCode: 'GENERAL', errorDetails: 'Missing bearer token' }, 401);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    return json({ errorCode: 'GENERAL', errorDetails: 'Invalid token' }, 401);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('user_id', userData.user.id)
    .maybeSingle();
  const organizationId: string | null = profile?.organization_id ?? null;

  let body: { context?: Record<string, unknown> } = {};
  try {
    const raw = await req.text();
    if (raw) body = JSON.parse(raw);
  } catch {
    return json({ errorCode: 'PARSE_ERROR', errorDetails: 'Invalid JSON body' }, 400);
  }
  const context = { ...(body.context ?? {}), organizationId: organizationId ?? undefined };

  let query = supabase
    .from('feature_flags')
    .select('key, organization_id, enabled, value_type, variants, default_variant, targeting, updated_at');
  query = organizationId
    ? query.or(`organization_id.eq.${organizationId},organization_id.is.null`)
    : query.is('organization_id', null);

  const { data, error } = await query;
  if (error) return json({ errorCode: 'GENERAL', errorDetails: error.message }, 500);

  // Org rows win over global rows with the same key.
  const byKey = new Map<string, FlagRow>();
  for (const row of (data ?? []) as FlagRow[]) {
    const existing = byKey.get(row.key);
    if (!existing || (!existing.organization_id && row.organization_id)) byKey.set(row.key, row);
  }

  const singleKey = path.replace(/^\/ofrep\/v1\/evaluate\/flags\/?/, '');
  if (singleKey) {
    const flag = byKey.get(decodeURIComponent(singleKey));
    if (!flag) {
      return json({ key: singleKey, errorCode: 'FLAG_NOT_FOUND', errorDetails: 'Flag not found' }, 404);
    }
    return json(evaluate(flag, context));
  }

  return json({ flags: Array.from(byKey.values()).map((f) => evaluate(f, context)) });
});
