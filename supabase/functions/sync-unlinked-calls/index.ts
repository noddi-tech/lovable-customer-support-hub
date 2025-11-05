import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SyncResult {
  total: number;
  synced: number;
  failed: number;
  skipped: number;
  details: Array<{
    callId: string;
    phone: string;
    status: 'synced' | 'failed' | 'skipped';
    reason?: string;
  }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[sync-unlinked-calls] 🚀 Starting background sync for unlinked calls');

    // Initialize Supabase client with service role key for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get organization ID from request or default to 'noddi'
    const { organizationId: requestOrgId } = await req.json().catch(() => ({}));
    
    let organizationId = requestOrgId;
    if (!organizationId) {
      const { data: org } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', 'noddi')
        .single();
      organizationId = org?.id;
    }

    if (!organizationId) {
      throw new Error('Organization ID is required');
    }

    console.log('[sync-unlinked-calls] 📋 Organization ID:', organizationId);

    // Find all calls without customer_id but with customer_phone
    const { data: unlinkedCalls, error: fetchError } = await supabase
      .from('calls')
      .select('id, customer_phone, customer_name, external_id')
      .eq('organization_id', organizationId)
      .is('customer_id', null)
      .not('customer_phone', 'is', null)
      .eq('hidden', false)
      .order('started_at', { ascending: false })
      .limit(100); // Process in batches of 100

    if (fetchError) {
      console.error('[sync-unlinked-calls] ❌ Error fetching unlinked calls:', fetchError);
      throw fetchError;
    }

    console.log('[sync-unlinked-calls] 📞 Found unlinked calls:', unlinkedCalls?.length || 0);

    const result: SyncResult = {
      total: unlinkedCalls?.length || 0,
      synced: 0,
      failed: 0,
      skipped: 0,
      details: [],
    };

    if (!unlinkedCalls || unlinkedCalls.length === 0) {
      console.log('[sync-unlinked-calls] ✅ No unlinked calls to process');
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Process each unlinked call
    for (const call of unlinkedCalls) {
      console.log('[sync-unlinked-calls] 🔍 Processing call:', call.id, call.customer_phone);

      try {
        // Normalize phone number
        const phone = call.customer_phone.replace(/\D/g, '');
        
        // First, check if customer already exists in local DB
        const { data: existingCustomer } = await supabase
          .from('customers')
          .select('id, full_name, email')
          .eq('phone', call.customer_phone)
          .eq('organization_id', organizationId)
          .maybeSingle();

        if (existingCustomer) {
          // Link call to existing customer
          const { error: updateError } = await supabase
            .from('calls')
            .update({ 
              customer_id: existingCustomer.id,
              customer_name: existingCustomer.full_name,
              customer_email: existingCustomer.email,
            })
            .eq('id', call.id);

          if (updateError) {
            console.error('[sync-unlinked-calls] ❌ Error linking to existing customer:', updateError);
            result.failed++;
            result.details.push({
              callId: call.id,
              phone: call.customer_phone,
              status: 'failed',
              reason: `Link error: ${updateError.message}`,
            });
          } else {
            console.log('[sync-unlinked-calls] ✅ Linked to existing customer:', existingCustomer.id);
            result.synced++;
            result.details.push({
              callId: call.id,
              phone: call.customer_phone,
              status: 'synced',
              reason: 'Linked to existing customer',
            });
          }
          continue;
        }

        // Lookup customer in Noddi
        console.log('[sync-unlinked-calls] 🔎 Looking up in Noddi:', call.customer_phone);
        const { data: noddiData, error: noddiError } = await supabase.functions.invoke(
          'noddi-customer-lookup',
          {
            body: {
              phone: call.customer_phone,
              organizationId: organizationId,
              forceRefresh: false, // Use cache for background sync
            },
          }
        );

        if (noddiError || !noddiData?.data?.found) {
          console.warn('[sync-unlinked-calls] ⚠️ Customer not found in Noddi:', call.customer_phone);
          result.skipped++;
          result.details.push({
            callId: call.id,
            phone: call.customer_phone,
            status: 'skipped',
            reason: 'Not found in Noddi',
          });
          continue;
        }

        // Extract customer data from Noddi response
        const user = noddiData.data.user;
        const uiMeta = noddiData.data.ui_meta;
        const userGroup = noddiData.data.all_user_groups?.find(
          (g: any) => g.is_personal || g.is_default
        ) || noddiData.data.all_user_groups?.[0];

        let customerName = null;
        if (uiMeta?.display_name && uiMeta.display_name.trim()) {
          customerName = uiMeta.display_name.trim();
        } else if (userGroup?.name && userGroup.name.trim()) {
          customerName = userGroup.name.trim();
        } else if (user.first_name || user.last_name) {
          customerName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();
        }

        const customerEmail = user.email || null;

        // Create customer in local database
        const { data: newCustomer, error: insertError } = await supabase
          .from('customers')
          .upsert(
            {
              phone: call.customer_phone,
              full_name: customerName,
              email: customerEmail,
              organization_id: organizationId,
              metadata: {
                noddi_user_id: user.id,
                synced_from_noddi: true,
                last_synced_at: new Date().toISOString(),
                synced_via: 'background_sync',
              },
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: 'phone,organization_id',
              ignoreDuplicates: false,
            }
          )
          .select('id')
          .single();

        if (insertError || !newCustomer) {
          console.error('[sync-unlinked-calls] ❌ Error creating customer:', insertError);
          result.failed++;
          result.details.push({
            callId: call.id,
            phone: call.customer_phone,
            status: 'failed',
            reason: `Customer creation error: ${insertError?.message}`,
          });
          continue;
        }

        // Link call to new customer
        const { error: updateError } = await supabase
          .from('calls')
          .update({
            customer_id: newCustomer.id,
            customer_name: customerName,
            customer_email: customerEmail,
          })
          .eq('id', call.id);

        if (updateError) {
          console.error('[sync-unlinked-calls] ❌ Error linking call to customer:', updateError);
          result.failed++;
          result.details.push({
            callId: call.id,
            phone: call.customer_phone,
            status: 'failed',
            reason: `Link error: ${updateError.message}`,
          });
        } else {
          console.log('[sync-unlinked-calls] ✅ Synced and linked:', newCustomer.id);
          result.synced++;
          result.details.push({
            callId: call.id,
            phone: call.customer_phone,
            status: 'synced',
            reason: 'Created new customer from Noddi',
          });
        }
      } catch (err) {
        console.error('[sync-unlinked-calls] 💥 Exception processing call:', err);
        result.failed++;
        result.details.push({
          callId: call.id,
          phone: call.customer_phone,
          status: 'failed',
          reason: `Exception: ${err.message}`,
        });
      }
    }

    console.log('[sync-unlinked-calls] 🎉 Sync complete:', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[sync-unlinked-calls] ❌ Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        total: 0,
        synced: 0,
        failed: 0,
        skipped: 0,
        details: [],
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
