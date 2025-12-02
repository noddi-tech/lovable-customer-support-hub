import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CleanupRequest {
  emailAccountId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { emailAccountId }: CleanupRequest = await req.json();

    if (!emailAccountId) {
      return new Response(
        JSON.stringify({ error: 'emailAccountId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🗑️ Starting cleanup for email account: ${emailAccountId}`);

    // Step 1: Get all conversation IDs for this email account
    const { data: conversations, error: conversationsError } = await supabase
      .from('conversations')
      .select('id')
      .eq('email_account_id', emailAccountId);

    if (conversationsError) {
      throw new Error(`Failed to fetch conversations: ${conversationsError.message}`);
    }

    const conversationIds = conversations?.map(c => c.id) || [];
    console.log(`📊 Found ${conversationIds.length} conversations to clean up`);

    if (conversationIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          deletedMessages: 0,
          deletedConversations: 0,
          message: 'No conversations found for this account'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Delete messages in batches of 50
    let totalMessagesDeleted = 0;
    const batchSize = 50;
    
    for (let i = 0; i < conversationIds.length; i += batchSize) {
      const batch = conversationIds.slice(i, i + batchSize);
      
      const { error: messagesError, count } = await supabase
        .from('messages')
        .delete({ count: 'exact' })
        .in('conversation_id', batch);

      if (messagesError) {
        console.error(`❌ Error deleting messages batch ${i / batchSize + 1}:`, messagesError);
      } else {
        totalMessagesDeleted += count || 0;
        console.log(`✅ Deleted ${count || 0} messages (batch ${i / batchSize + 1}/${Math.ceil(conversationIds.length / batchSize)})`);
      }
    }

    // Step 3: Delete conversations in batches of 50
    let totalConversationsDeleted = 0;
    
    for (let i = 0; i < conversationIds.length; i += batchSize) {
      const batch = conversationIds.slice(i, i + batchSize);
      
      const { error: conversationsDeleteError, count } = await supabase
        .from('conversations')
        .delete({ count: 'exact' })
        .in('id', batch);

      if (conversationsDeleteError) {
        console.error(`❌ Error deleting conversations batch ${i / batchSize + 1}:`, conversationsDeleteError);
      } else {
        totalConversationsDeleted += count || 0;
        console.log(`✅ Deleted ${count || 0} conversations (batch ${i / batchSize + 1}/${Math.ceil(conversationIds.length / batchSize)})`);
      }
    }

    console.log(`✅ Cleanup complete: ${totalConversationsDeleted} conversations, ${totalMessagesDeleted} messages deleted`);

    return new Response(
      JSON.stringify({
        success: true,
        deletedMessages: totalMessagesDeleted,
        deletedConversations: totalConversationsDeleted
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Cleanup error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
