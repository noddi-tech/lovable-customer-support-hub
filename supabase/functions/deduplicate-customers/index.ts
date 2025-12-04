import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface DeduplicationResult {
  duplicatesFound: number;
  customersMerged: number;
  conversationsUpdated: number;
  customersDeleted: number;
  errors: string[];
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organizationId, dryRun = true } = await req.json();

    if (!organizationId) {
      return new Response(
        JSON.stringify({ error: 'organizationId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const result: DeduplicationResult = {
      duplicatesFound: 0,
      customersMerged: 0,
      conversationsUpdated: 0,
      customersDeleted: 0,
      errors: [],
    };

    console.log(`[Deduplicate] Starting deduplication for org: ${organizationId}, dryRun: ${dryRun}`);

    // Find duplicate customers by email within the organization
    const { data: duplicates, error: dupError } = await supabase.rpc('find_duplicate_customers', {
      org_id: organizationId
    });

    // If RPC doesn't exist, use raw query approach
    const { data: allCustomers, error: custError } = await supabase
      .from('customers')
      .select('id, email, full_name, phone, created_at, metadata')
      .eq('organization_id', organizationId)
      .not('email', 'is', null)
      .order('created_at', { ascending: true });

    if (custError) {
      console.error('[Deduplicate] Error fetching customers:', custError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch customers' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group customers by normalized email
    const emailGroups: Record<string, typeof allCustomers> = {};
    for (const customer of allCustomers || []) {
      const normalizedEmail = customer.email?.toLowerCase().trim();
      if (!normalizedEmail) continue;
      
      if (!emailGroups[normalizedEmail]) {
        emailGroups[normalizedEmail] = [];
      }
      emailGroups[normalizedEmail].push(customer);
    }

    // Find groups with duplicates
    const duplicateGroups = Object.entries(emailGroups).filter(([_, customers]) => customers.length > 1);
    result.duplicatesFound = duplicateGroups.reduce((sum, [_, customers]) => sum + customers.length - 1, 0);

    console.log(`[Deduplicate] Found ${duplicateGroups.length} email addresses with duplicates (${result.duplicatesFound} duplicate records)`);

    if (dryRun) {
      // Return preview of what would be merged
      const preview = duplicateGroups.map(([email, customers]) => {
        // Keep the one with a proper name (not email) or the oldest one
        const sorted = customers.sort((a, b) => {
          // Prioritize records with actual names
          const aHasName = a.full_name && a.full_name.toLowerCase() !== a.email?.toLowerCase();
          const bHasName = b.full_name && b.full_name.toLowerCase() !== b.email?.toLowerCase();
          if (aHasName && !bHasName) return -1;
          if (!aHasName && bHasName) return 1;
          // Then by creation date (keep oldest)
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
        
        return {
          email,
          keepCustomer: { id: sorted[0].id, full_name: sorted[0].full_name },
          deleteCustomers: sorted.slice(1).map(c => ({ id: c.id, full_name: c.full_name })),
        };
      });

      return new Response(
        JSON.stringify({ 
          dryRun: true,
          ...result,
          preview 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Actually perform the merge
    for (const [email, customers] of duplicateGroups) {
      try {
        // Sort: prioritize records with actual names, then oldest
        const sorted = customers.sort((a, b) => {
          const aHasName = a.full_name && a.full_name.toLowerCase() !== a.email?.toLowerCase();
          const bHasName = b.full_name && b.full_name.toLowerCase() !== b.email?.toLowerCase();
          if (aHasName && !bHasName) return -1;
          if (!aHasName && bHasName) return 1;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });

        const keepCustomer = sorted[0];
        const duplicateIds = sorted.slice(1).map(c => c.id);

        console.log(`[Deduplicate] Merging ${email}: keeping ${keepCustomer.id} (${keepCustomer.full_name}), deleting ${duplicateIds.length} duplicates`);

        // Update all conversations to point to the kept customer
        for (const dupId of duplicateIds) {
          const { data: updatedConvs, error: convError } = await supabase
            .from('conversations')
            .update({ customer_id: keepCustomer.id })
            .eq('customer_id', dupId)
            .select('id');

          if (convError) {
            console.error(`[Deduplicate] Error updating conversations for ${dupId}:`, convError);
            result.errors.push(`Failed to update conversations for customer ${dupId}: ${convError.message}`);
            continue;
          }

          result.conversationsUpdated += (updatedConvs?.length || 0);
          console.log(`[Deduplicate] Updated ${updatedConvs?.length || 0} conversations from ${dupId} to ${keepCustomer.id}`);
        }

        // Delete duplicate customers
        const { error: deleteError } = await supabase
          .from('customers')
          .delete()
          .in('id', duplicateIds);

        if (deleteError) {
          console.error(`[Deduplicate] Error deleting duplicates for ${email}:`, deleteError);
          result.errors.push(`Failed to delete duplicates for ${email}: ${deleteError.message}`);
        } else {
          result.customersDeleted += duplicateIds.length;
          result.customersMerged++;
        }

      } catch (error) {
        console.error(`[Deduplicate] Error processing ${email}:`, error);
        result.errors.push(`Error processing ${email}: ${error.message}`);
      }
    }

    console.log(`[Deduplicate] Completed: ${result.customersMerged} emails merged, ${result.conversationsUpdated} conversations updated, ${result.customersDeleted} customers deleted`);

    return new Response(
      JSON.stringify({ 
        dryRun: false,
        ...result 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[Deduplicate] Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
