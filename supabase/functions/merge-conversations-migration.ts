/**
 * Migration Script: Merge Split Email Conversations
 * 
 * This script retroactively fixes conversations that were split due to incorrect
 * email threading logic. It handles multiple email header formats including:
 * - Array format: [{name, value}]
 * - Object format: {from, to, inReplyTo, references}
 * - Raw format: {raw: "headers string"}
 * 
 * It also detects HelpScout emails and extracts their conversation IDs.
 * 
 * Run with: deno run --allow-net --allow-env merge-conversations-migration.ts
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface Message {
  id: string;
  conversation_id: string;
  email_message_id: string;
  email_headers: 
    | Array<{name: string; value: string}>
    | {from?: string; to?: string; inReplyTo?: string; references?: string}
    | {raw: string}
    | null;
  created_at: string;
}

interface Conversation {
  id: string;
  external_id: string;
  created_at: string;
  organization_id: string;
}

// Parse raw email headers (format: "Header: value\r\nHeader2: value2")
function parseRawHeaders(raw: string): Map<string, string> {
  const headers = new Map<string, string>();
  const lines = raw.split(/\r?\n/);
  let currentHeader = '';
  let currentValue = '';
  
  for (const line of lines) {
    if (line.match(/^\s/) && currentHeader) {
      // Continuation of previous header
      currentValue += ' ' + line.trim();
    } else {
      // Save previous header
      if (currentHeader) {
        headers.set(currentHeader.toLowerCase(), currentValue);
      }
      // Parse new header
      const match = line.match(/^([^:]+):\s*(.*)$/);
      if (match) {
        currentHeader = match[1].trim();
        currentValue = match[2].trim();
      }
    }
  }
  
  // Save last header
  if (currentHeader) {
    headers.set(currentHeader.toLowerCase(), currentValue);
  }
  
  return headers;
}

// Extract header value from various formats
function getHeaderValue(headers: Message['email_headers'], headerName: string): string | undefined {
  if (!headers) return undefined;
  
  const lowerName = headerName.toLowerCase();
  
  // Array format: [{name, value}]
  if (Array.isArray(headers)) {
    const header = headers.find(h => h.name.toLowerCase() === lowerName);
    return header?.value;
  }
  
  // Raw format: {raw: "headers string"}
  if ('raw' in headers && typeof headers.raw === 'string') {
    const parsed = parseRawHeaders(headers.raw);
    return parsed.get(lowerName);
  }
  
  // Object format: {from, to, inReplyTo, references}
  if (lowerName === 'in-reply-to' && 'inReplyTo' in headers) {
    return headers.inReplyTo;
  }
  if (lowerName === 'references' && 'references' in headers) {
    return headers.references;
  }
  if (lowerName === 'message-id' || lowerName === 'message-id') {
    // Try to find it in the object
    if ('messageId' in headers) return (headers as any).messageId;
  }
  
  return undefined;
}

// Check if this is a HelpScout email and extract conversation ID
function extractHelpScoutThreadId(messageId?: string, inReplyTo?: string, references?: string): string | null {
  const helpScoutPattern = /reply-(\d+)-(\d+)(-\d+)?@helpscout\.net/;
  
  // Check Message-ID
  if (messageId) {
    const match = messageId.match(helpScoutPattern);
    if (match) {
      return `reply-${match[1]}-${match[2]}`;
    }
  }
  
  // Check In-Reply-To
  if (inReplyTo) {
    const match = inReplyTo.match(helpScoutPattern);
    if (match) {
      return `reply-${match[1]}-${match[2]}`;
    }
  }
  
  // Check References
  if (references) {
    const match = references.match(helpScoutPattern);
    if (match) {
      return `reply-${match[1]}-${match[2]}`;
    }
  }
  
  return null;
}

// Compute canonical thread ID using the same logic as edge functions
function getCanonicalThreadId(messageId: string, inReplyTo?: string, references?: string): string {
  const cleanId = (id: string) => id?.replace(/[<>]/g, '').trim();
  
  // Check for HelpScout pattern first
  const helpScoutThreadId = extractHelpScoutThreadId(messageId, inReplyTo, references);
  if (helpScoutThreadId) {
    return helpScoutThreadId;
  }
  
  // PRIORITY 1: References header (first Message-ID is the thread root)
  if (references) {
    const messageIds = references.match(/<[^>]+>/g);
    if (messageIds && messageIds.length > 0) {
      return cleanId(messageIds[0]);
    }
  }
  
  // PRIORITY 2: In-Reply-To (fallback if no References)
  if (inReplyTo) {
    return cleanId(inReplyTo);
  }
  
  // PRIORITY 3: Message-ID (new thread)
  return cleanId(messageId);
}

async function migrateConversations() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    Deno.exit(1);
  }
  
  console.log('🚀 Starting conversation merge migration...');
  console.log(`📍 Supabase URL: ${supabaseUrl}`);
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Fetch all messages with email headers
  console.log('\n📥 Fetching messages with email headers...');
  const { data: messages, error: messagesError } = await supabase
    .from('messages')
    .select('id, conversation_id, email_message_id, email_headers, created_at')
    .not('email_headers', 'is', null)
    .not('email_message_id', 'is', null)
    .order('created_at', { ascending: true });
  
  if (messagesError) {
    console.error('❌ Error fetching messages:', messagesError);
    Deno.exit(1);
  }
  
  console.log(`✅ Found ${messages?.length || 0} messages with email headers`);
  
  if (!messages || messages.length === 0) {
    console.log('✨ No messages to process');
    return;
  }
  
  // Group messages by computed canonical thread ID
  console.log('\n🔍 Computing canonical thread IDs for all messages...');
  const threadGroups = new Map<string, Message[]>();
  let helpScoutCount = 0;
  let standardCount = 0;
  
  for (const msg of messages as Message[]) {
    const inReplyTo = getHeaderValue(msg.email_headers, 'In-Reply-To');
    const references = getHeaderValue(msg.email_headers, 'References');
    
    const canonicalThreadId = getCanonicalThreadId(
      msg.email_message_id,
      inReplyTo,
      references
    );
    
    // Track HelpScout vs standard emails
    if (canonicalThreadId.startsWith('reply-')) {
      helpScoutCount++;
    } else {
      standardCount++;
    }
    
    if (!threadGroups.has(canonicalThreadId)) {
      threadGroups.set(canonicalThreadId, []);
    }
    threadGroups.get(canonicalThreadId)!.push(msg);
  }
  
  console.log(`✅ Computed thread IDs for ${messages.length} messages`);
  console.log(`   📧 HelpScout emails: ${helpScoutCount}`);
  console.log(`   📧 Standard emails: ${standardCount}`);
  console.log(`   🧵 Total unique threads: ${threadGroups.size}`);
  
  // Find threads that are split across multiple conversations
  console.log('\n🔎 Identifying split threads...');
  const splitThreads = new Map<string, Message[]>();
  
  for (const [threadId, msgs] of threadGroups) {
    const conversationIds = new Set(msgs.map(m => m.conversation_id));
    if (conversationIds.size > 1) {
      splitThreads.set(threadId, msgs);
      console.log(`   🔴 Thread ${threadId.substring(0, 40)}... is split across ${conversationIds.size} conversations (${msgs.length} messages)`);
    }
  }
  
  if (splitThreads.size === 0) {
    console.log('✅ No split threads found - all conversations are properly threaded!');
    return;
  }
  
  console.log(`\n⚠️  Found ${splitThreads.size} split threads that need merging`);
  
  // Merge conversations for each split thread
  console.log('\n🔄 Starting merge process...');
  let mergedCount = 0;
  let failedCount = 0;
  
  for (const [threadId, msgs] of splitThreads) {
    try {
      // Get unique conversation IDs for this thread
      const conversationIds = Array.from(new Set(msgs.map(m => m.conversation_id)));
      
      console.log(`\n📝 Processing thread: ${threadId.substring(0, 60)}...`);
      console.log(`   Split across ${conversationIds.length} conversations: ${conversationIds.map(id => id.substring(0, 8)).join(', ')}...`);
      
      // Fetch the involved conversations
      const { data: conversations, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .in('id', conversationIds);
      
      if (convError || !conversations || conversations.length === 0) {
        console.error(`   ❌ Error fetching conversations:`, convError);
        failedCount++;
        continue;
      }
      
      // Sort by created_at to find the oldest (primary) conversation
      const sortedConversations = (conversations as Conversation[]).sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
      
      const primaryConversation = sortedConversations[0];
      const duplicateConversationIds = conversationIds.filter(id => id !== primaryConversation.id);
      
      console.log(`   ✅ Primary conversation: ${primaryConversation.id.substring(0, 8)}... (created ${primaryConversation.created_at})`);
      console.log(`   🗑️  Will merge ${duplicateConversationIds.length} duplicate conversations`);
      
      // Reassign all messages to the primary conversation
      const { error: updateError } = await supabase
        .from('messages')
        .update({ conversation_id: primaryConversation.id })
        .in('id', msgs.map(m => m.id));
      
      if (updateError) {
        console.error(`   ❌ Error updating messages:`, updateError);
        failedCount++;
        continue;
      }
      
      console.log(`   ✅ Reassigned ${msgs.length} messages to primary conversation`);
      
      // Update the primary conversation's external_id and received_at
      const oldestMessage = msgs.sort((a, b) => 
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )[0];
      
      const { error: convUpdateError } = await supabase
        .from('conversations')
        .update({ 
          external_id: threadId,
          received_at: oldestMessage.created_at
        })
        .eq('id', primaryConversation.id);
      
      if (convUpdateError) {
        console.error(`   ⚠️  Warning: Could not update primary conversation external_id:`, convUpdateError);
      }
      
      // Delete duplicate conversations
      const { error: deleteError } = await supabase
        .from('conversations')
        .delete()
        .in('id', duplicateConversationIds);
      
      if (deleteError) {
        console.error(`   ❌ Error deleting duplicate conversations:`, deleteError);
        failedCount++;
        continue;
      }
      
      console.log(`   ✅ Deleted ${duplicateConversationIds.length} duplicate conversations`);
      mergedCount++;
      
    } catch (error) {
      console.error(`   ❌ Unexpected error processing thread:`, error);
      failedCount++;
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Migration Summary');
  console.log('='.repeat(60));
  console.log(`✅ Successfully merged: ${mergedCount} threads`);
  console.log(`❌ Failed to merge: ${failedCount} threads`);
  console.log(`📧 Total messages processed: ${messages.length}`);
  console.log(`🧵 Unique threads identified: ${threadGroups.size}`);
  console.log(`📧 HelpScout emails: ${helpScoutCount}`);
  console.log(`📧 Standard emails: ${standardCount}`);
  console.log('='.repeat(60));
  
  if (failedCount > 0) {
    console.log('\n⚠️  Some threads failed to merge. Please review the errors above.');
    Deno.exit(1);
  } else {
    console.log('\n✨ Migration completed successfully!');
  }
}

// Run the migration
if (import.meta.main) {
  await migrateConversations();
}
