import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = 'https://qgfaycwsangsqzpveoup.supabase.co';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req: Request) => {
  console.log('Starting scheduled email sync...');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all active email accounts
    const { data: emailAccounts, error } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('is_active', true)
      .not('access_token', 'is', null);

    if (error) {
      console.error('Error fetching email accounts:', error);
      return new Response('Error fetching accounts', { status: 500 });
    }

    console.log(`Found ${emailAccounts.length} active email accounts to sync`);

    const syncResults = [];

    for (const account of emailAccounts) {
      try {
        console.log(`Triggering sync for ${account.email_address}`);
        
        // Call the gmail-sync function for each account
        const syncResponse = await supabase.functions.invoke('gmail-sync', {
          body: { emailAccountId: account.id },
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
          },
        });

        if (syncResponse.error) {
          console.error(`Sync failed for ${account.email_address}:`, syncResponse.error);
          syncResults.push({
            accountId: account.id,
            email: account.email_address,
            success: false,
            error: syncResponse.error.message
          });
        } else {
          console.log(`Sync completed for ${account.email_address}`);
          syncResults.push({
            accountId: account.id,
            email: account.email_address,
            success: true,
            ...syncResponse.data
          });
        }
      } catch (error) {
        console.error(`Error syncing ${account.email_address}:`, error);
        syncResults.push({
          accountId: account.id,
          email: account.email_address,
          success: false,
          error: error.message
        });
      }

      // Add a small delay between syncs to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('Scheduled sync completed:', syncResults);

    return new Response(JSON.stringify({
      message: 'Sync completed',
      totalAccounts: emailAccounts.length,
      results: syncResults
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in email sync scheduler:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});