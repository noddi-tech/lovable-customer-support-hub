import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    console.log('[monitor-database-health] Starting health check...');

    // Check 1: Count duplicate messages
    console.log('[monitor-database-health] Checking for duplicate messages...');
    const { data: messages, error: dupError } = await supabase
      .from('messages')
      .select('external_id')
      .not('external_id', 'is', null);

    let duplicateCount = 0;
    if (!dupError && messages) {
      // Count unique external_ids
      const uniqueIds = new Set(messages.map(m => m.external_id));
      duplicateCount = messages.length - uniqueIds.size;
    }

    // Check 2: Database storage usage
    console.log('[monitor-database-health] Checking database size...');
    const { data: dbSize, error: sizeError } = await supabase.rpc('get_database_size');
    
    // Check 3: Message sync metrics (last 24 hours)
    console.log('[monitor-database-health] Checking recent sync activity...');
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count: recentMessages, error: recentError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneDayAgo);

    // Check 4: Email accounts status
    console.log('[monitor-database-health] Checking email accounts...');
    const { data: emailAccounts, error: accountsError } = await supabase
      .from('email_accounts')
      .select('id, auto_sync_enabled, last_sync_at, sync_status');

    const healthReport = {
      timestamp: new Date().toISOString(),
      checks: {
        duplicates: {
          status: duplicateCount === 0 ? 'healthy' : (duplicateCount < 100 ? 'warning' : 'critical'),
          count: duplicateCount,
          message: duplicateCount === 0 
            ? 'No duplicate messages found' 
            : `Found ${duplicateCount} duplicate messages`
        },
        storage: {
          status: sizeError ? 'unknown' : 'info',
          size: dbSize || 'unknown',
          error: sizeError?.message
        },
        recentActivity: {
          status: recentError ? 'error' : 'info',
          messagesLast24h: recentMessages || 0,
          error: recentError?.message
        },
        emailAccounts: {
          status: accountsError ? 'error' : 'info',
          total: emailAccounts?.length || 0,
          active: emailAccounts?.filter(a => a.auto_sync_enabled).length || 0,
          error: accountsError?.message
        }
      },
      overallStatus: duplicateCount === 0 ? 'healthy' : (duplicateCount < 100 ? 'warning' : 'critical')
    };

    console.log('[monitor-database-health] Health check complete:', healthReport.overallStatus);

    // Auto-trigger cleanup for minor issues
    if (duplicateCount > 0 && duplicateCount < 100) {
      console.log('[monitor-database-health] Triggering automatic cleanup for minor duplicates...');
      
      try {
        const { error: cleanupError } = await supabase.functions.invoke('cleanup-duplicate-messages');
        
        if (cleanupError) {
          console.error('[monitor-database-health] Auto-cleanup failed:', cleanupError);
          healthReport.checks.duplicates.message += ' (auto-cleanup failed)';
        } else {
          console.log('[monitor-database-health] Auto-cleanup initiated successfully');
          healthReport.checks.duplicates.message += ' (auto-cleanup triggered)';
        }
      } catch (cleanupErr) {
        console.error('[monitor-database-health] Error triggering cleanup:', cleanupErr);
      }
    }

    return new Response(
      JSON.stringify(healthReport),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[monitor-database-health] Fatal error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
