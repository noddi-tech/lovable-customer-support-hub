import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { normalizeToE164 } from './phone.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-key, x-app-version',
};

const AIRCALL_API = 'https://api.aircall.io/v1';
// Aircall allows 60 requests/minute. We use ~2 requests per customer, so we pace
// requests to stay comfortably below the limit.
const REQUEST_INTERVAL_MS = 1100;
const DEFAULT_BATCH_SIZE = 100;
const MAX_BATCH_SIZE = 250;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface CustomerRow {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  metadata: Record<string, unknown> | null;
  updated_at: string;
}

function splitName(fullName: string): { first_name: string; last_name: string } {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { first_name: parts[0], last_name: '-' };
  return { first_name: parts.slice(0, -1).join(' '), last_name: parts[parts.length - 1] };
}

async function aircallFetch(
  auth: string,
  path: string,
  init: RequestInit = {},
  attempt = 0,
): Promise<Response> {
  const res = await fetch(`${AIRCALL_API}${path}`, {
    ...init,
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  // Back off on rate limiting
  if (res.status === 429 && attempt < 3) {
    const retryAfter = Number(res.headers.get('Retry-After') || '10');
    console.log(`[aircall-sync-contacts] Rate limited, waiting ${retryAfter}s`);
    await sleep(retryAfter * 1000);
    return aircallFetch(auth, path, init, attempt + 1);
  }

  return res;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const adminClient = createClient(supabaseUrl, serviceKey);

  try {
    let body: {
      organizationId?: string;
      limit?: number;
      dryRun?: boolean;
      force?: boolean;
    } = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const cronKey = Deno.env.get('AIRCALL_SYNC_CRON_SECRET');
    const authHeaderRaw = req.headers.get('Authorization') || '';
    const isCron =
      (!!cronKey && req.headers.get('x-cron-key') === cronKey) ||
      authHeaderRaw === `Bearer ${serviceKey}`;

    // ---- Determine which organizations to sync -------------------------
    let organizationIds: string[] = [];

    if (isCron) {
      const { data: orgs, error } = await adminClient
        .from('voice_integrations')
        .select('organization_id')
        .eq('provider', 'aircall')
        .eq('is_active', true);
      if (error) throw error;
      organizationIds = (orgs || []).map((o: any) => o.organization_id).filter(Boolean);
    } else {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) return json({ error: 'Missing authorization header' }, 401);

      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user }, error: userError } = await userClient.auth.getUser();
      if (userError || !user) return json({ error: 'Unauthorized' }, 401);

      const { data: roleData, error: roleError } = await adminClient
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'super_admin']);
      if (roleError) return json({ error: 'Failed to verify permissions' }, 500);
      if (!roleData || roleData.length === 0) {
        return json({ error: 'Forbidden: Admin access required' }, 403);
      }

      const { data: profile } = await adminClient
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .maybeSingle();

      const orgId = body.organizationId || profile?.organization_id;
      if (!orgId) return json({ error: 'No organization found for user' }, 400);
      organizationIds = [orgId];
    }

    if (organizationIds.length === 0) {
      return json({ success: true, organizations: [], message: 'No organizations to sync' });
    }

    const limit = Math.min(Math.max(Number(body.limit) || DEFAULT_BATCH_SIZE, 1), MAX_BATCH_SIZE);
    const results: any[] = [];

    for (const organizationId of organizationIds) {
      const { data: integration } = await adminClient
        .from('voice_integrations')
        .select('configuration')
        .eq('organization_id', organizationId)
        .eq('provider', 'aircall')
        .maybeSingle();

      const everywhere = (integration?.configuration as any)?.aircallEverywhere;
      const apiId = everywhere?.apiId;
      const apiToken = everywhere?.apiToken;

      if (!apiId || !apiToken) {
        results.push({ organizationId, error: 'Aircall API credentials not configured' });
        continue;
      }

      const auth = `Basic ${btoa(`${apiId}:${apiToken}`)}`;

      const { data: customers, error: customersError } = await adminClient
        .from('customers')
        .select('id, full_name, phone, email, metadata, updated_at')
        .eq('organization_id', organizationId)
        .not('phone', 'is', null)
        .neq('phone', '')
        .not('full_name', 'is', null)
        .neq('full_name', '')
        .order('updated_at', { ascending: false })
        .limit(1000);

      if (customersError) {
        results.push({ organizationId, error: customersError.message });
        continue;
      }

      const summary = {
        organizationId,
        eligible: 0,
        created: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        remaining: 0,
        errors: [] as string[],
      };

      // Brand labels assigned on this customer's conversations (email + live chat).
      // A customer can have several brands; we surface them all on the contact.
      const brandsByCustomer = new Map<string, string[]>();
      const customerIds = (customers || []).map((c: any) => c.id);
      for (let i = 0; i < customerIds.length; i += 200) {
        const chunk = customerIds.slice(i, i + 200);
        const { data: convs } = await adminClient
          .from('conversations')
          .select('customer_id, metadata')
          .in('customer_id', chunk);
        for (const conv of (convs || []) as any[]) {
          const cmeta = (conv.metadata || {}) as Record<string, any>;
          const label =
            (typeof cmeta.brand === 'string' && cmeta.brand.trim()) ||
            (typeof cmeta.brand_name === 'string' && cmeta.brand_name.trim()) ||
            '';
          if (!label || !conv.customer_id) continue;
          const list = brandsByCustomer.get(conv.customer_id) || [];
          if (!list.some((b) => b.toLowerCase() === label.toLowerCase())) list.push(label);
          brandsByCustomer.set(conv.customer_id, list);
        }
      }
      const brandSignature = (customerId: string) =>
        (brandsByCustomer.get(customerId) || [])
          .map((b) => b.toLowerCase())
          .sort()
          .join(',');

      // Only sync customers we have not pushed yet, or whose name/phone/brands changed
      const pending: Array<{ row: CustomerRow; phone: string }> = [];
      for (const row of (customers || []) as CustomerRow[]) {
        const phone = normalizeToE164(row.phone || '');
        if (!phone) continue;
        summary.eligible++;

        const meta = (row.metadata || {}) as Record<string, any>;
        const sig = `v3|${row.full_name?.trim()}|${phone}|${row.email || ''}|${brandSignature(row.id)}`;
        if (!body.force && meta.aircall_synced_signature === sig) {
          summary.skipped++;
          continue;
        }
        pending.push({ row, phone });
      }

      const batch = pending.slice(0, limit);
      summary.remaining = Math.max(pending.length - batch.length, 0);

      if (body.dryRun) {
        results.push({ ...summary, dryRun: true, pending: pending.length });
        continue;
      }

      // Extra identities (alternative emails / phones) for richer Aircall contacts
      const identitiesByCustomer = new Map<string, { emails: string[]; phones: string[] }>();
      if (batch.length > 0) {
        const { data: identities } = await adminClient
          .from('customer_identities')
          .select('customer_id, identity_type, value')
          .in('customer_id', batch.map(({ row }) => row.id));
        for (const identity of (identities || []) as any[]) {
          const entry = identitiesByCustomer.get(identity.customer_id) || { emails: [], phones: [] };
          if (identity.identity_type === 'email' && identity.value) entry.emails.push(identity.value);
          if (identity.identity_type === 'phone' && identity.value) entry.phones.push(identity.value);
          identitiesByCustomer.set(identity.customer_id, entry);
        }
      }






      for (const { row, phone } of batch) {
        try {
          const meta = (row.metadata || {}) as Record<string, any>;
          const { first_name, last_name } = splitName(row.full_name || '');
          const extra = identitiesByCustomer.get(row.id) || { emails: [], phones: [] };

          // Phones: primary first, then any alternative verified numbers
          const phoneValues = [phone];
          for (const raw of extra.phones) {
            const normalized = normalizeToE164(raw);
            if (normalized && !phoneValues.includes(normalized)) phoneValues.push(normalized);
          }

          // Emails: primary, alternative identities, and Noddi alternates in metadata
          const emailValues: string[] = [];
          const pushEmail = (value?: string | null) => {
            const clean = (value || '').trim().toLowerCase();
            if (clean && clean.includes('@') && !emailValues.includes(clean)) emailValues.push(clean);
          };
          pushEmail(row.email);
          pushEmail(meta.primary_noddi_email);
          extra.emails.forEach(pushEmail);
          (Array.isArray(meta.alternative_emails) ? meta.alternative_emails : []).forEach((e: any) =>
            pushEmail(typeof e === 'string' ? e : e?.email),
          );

          const brands = brandsByCustomer.get(row.id) || [];

          const information = [
            brands.length ? `Brands: ${brands.join(', ')}` : null,
            meta.noddi_user_id ? `Noddi user #${meta.noddi_user_id}` : null,
            `Support Hub: https://support.noddi.co/customers?customer=${row.id}`,
          ]
            .filter(Boolean)
            .join('\n');

          const payload: Record<string, unknown> = {
            first_name,
            last_name,
            information,
            ...(brands.length ? { company_name: brands.join(', ').slice(0, 255) } : {}),

            phone_numbers: phoneValues.slice(0, 5).map((value, i) => ({
              label: i === 0 ? 'Mobile' : 'Other',
              value,
            })),
            ...(emailValues.length
              ? {
                  emails: emailValues.slice(0, 5).map((value, i) => ({
                    label: i === 0 ? 'Work' : 'Other',
                    value,
                  })),
                }
              : {}),
          };


          // Resolve the existing Aircall contact: known id first, then search by phone
          let contactId: number | null = meta.aircall_contact_id ?? null;

          if (!contactId) {
            const searchRes = await aircallFetch(
              auth,
              `/contacts/search?phone_number=${encodeURIComponent(phone)}`,
            );
            if (searchRes.ok) {
              const searchData = await searchRes.json();
              contactId = searchData?.contacts?.[0]?.id ?? null;
            } else if (searchRes.status !== 404) {
              throw new Error(`search failed (${searchRes.status})`);
            }
            await sleep(REQUEST_INTERVAL_MS);
          }

          const writeRes = contactId
            ? await aircallFetch(auth, `/contacts/${contactId}`, {
                method: 'POST',
                body: JSON.stringify(payload),
              })
            : await aircallFetch(auth, '/contacts', {
                method: 'POST',
                body: JSON.stringify(payload),
              });

          if (!writeRes.ok) {
            const text = await writeRes.text();
            throw new Error(`write failed (${writeRes.status}): ${text.slice(0, 200)}`);
          }

          const written = await writeRes.json();
          const newId = written?.contact?.id ?? contactId;

          await adminClient
            .from('customers')
            .update({
              metadata: {
                ...meta,
                aircall_contact_id: newId,
                aircall_synced_at: new Date().toISOString(),
                aircall_synced_signature: `v2|${row.full_name?.trim()}|${phone}|${row.email || ''}`,
              },
            })
            .eq('id', row.id);

          if (contactId) summary.updated++;
          else summary.created++;

          await sleep(REQUEST_INTERVAL_MS);
        } catch (err) {
          summary.failed++;
          const msg = err instanceof Error ? err.message : String(err);
          console.error('[aircall-sync-contacts] Failed for customer', row.id, msg);
          if (summary.errors.length < 5) summary.errors.push(msg);
          await sleep(REQUEST_INTERVAL_MS);
        }
      }

      console.log('[aircall-sync-contacts] Summary', JSON.stringify(summary));
      results.push(summary);
    }

    return json({ success: true, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[aircall-sync-contacts] Error:', message);
    return json({ success: false, error: message }, 500);
  }
});
