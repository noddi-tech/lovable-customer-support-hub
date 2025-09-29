/**
 * Migration Script: Merge Split Email Conversations (Comprehensive Fix)
 * 
 * This script fixes conversations split due to incorrect email threading:
 * - Phase 1: Backfill missing email_message_id and email_thread_id
 * - Phase 2: Detect and merge split HelpScout threads via external_id
 * - Phase 3: Detect and merge split standard email threads via message headers
 * 
 * Run with: 
 * SUPABASE_URL=<url> SUPABASE_SERVICE_ROLE_KEY=<key> deno run --allow-net --allow-env merge-conversations-migration.ts
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface Message {
  id: string;
  conversation_id: string;
  email_message_id: string | null;
  email_thread_id: string | null;
  email_headers: 
    | Array<{name: string; value: string}>
    | {from?: string; to?: string; inReplyTo?: string; references?: string}
    | {raw: string}
    | null;
  created_at: string;
}

interface Conversation {
  id: string;
  external_id: string | null;
  created_at: string;
  organization_id: string;
  messages?: any[];
}

// Parse raw email headers
function parseRawHeaders(raw: string): Map<string, string> {
  const headers = new Map<string, string>();
  const lines = raw.split(/\r?\n/);
  let currentHeader = '';
  let currentValue = '';
  
  for (const line of lines) {
    if (line.match(/^\s/) && currentHeader) {
      currentValue += ' ' + line.trim();
    } else {
      if (currentHeader) {
        headers.set(currentHeader.toLowerCase(), currentValue);
      }
      const match = line.match(/^([^:]+):\s*(.*)$/);
      if (match) {
        currentHeader = match[1].trim();
        currentValue = match[2].trim();
      }
    }
  }
  
  if (currentHeader) {
    headers.set(currentHeader.toLowerCase(), currentValue);
  }
  
  return headers;
}

// Extract header value from various formats
function getHeaderValue(headers: Message['email_headers'], headerName: string): string | undefined {
  if (!headers) return undefined;
  
  const lowerName = headerName.toLowerCase();
  
  if (Array.isArray(headers)) {
    const header = headers.find(h => h.name.toLowerCase() === lowerName);
    return header?.value;
  }
  
  if ('raw' in headers && typeof headers.raw === 'string') {
    const parsed = parseRawHeaders(headers.raw);
    return parsed.get(lowerName);
  }
  
  if (lowerName === 'in-reply-to' && 'inReplyTo' in headers) {
    return headers.inReplyTo;
  }
  if (lowerName === 'references' && 'references' in headers) {
    return headers.references;
  }
  if (lowerName === 'message-id' && 'messageId' in headers) {
    return (headers as any).messageId;
  }
  
  return undefined;
}

// Check for HelpScout pattern and extract thread ID
function extractHelpScoutThreadId(messageId?: string, inReplyTo?: string, references?: string): string | null {
  const helpScoutPattern = /reply-(\d+)-(\d+)(-\d+)?@helpscout\.net/;
  
  if (messageId) {
    const match = messageId.match(helpScoutPattern);
    if (match) return `reply-${match[1]}-${match[2]}`;
  }
  
  if (inReplyTo) {
    const match = inReplyTo.match(helpScoutPattern);
    if (match) return `reply-${match[1]}-${match[2]}`;
  }
  
  if (references) {
    const match = references.match(helpScoutPattern);
    if (match) return `reply-${match[1]}-${match[2]}`;
  }
  
  return null;
}

// Compute canonical thread ID
function getCanonicalThreadId(messageId: string, inReplyTo?: string, references?: string): string {
  const cleanId = (id: string) => id?.replace(/[<>]/g, '').trim();
  
  const helpScoutThreadId = extractHelpScoutThreadId(messageId, inReplyTo, references);
  if (helpScoutThreadId) return helpScoutThreadId;
  
  if (references) {
    const messageIds = references.match(/<[^>]+>/g);
    if (messageIds && messageIds.length > 0) {
      return cleanId(messageIds[0]);
    }
  }
  
  if (inReplyTo) return cleanId(inReplyTo);
  
  return cleanId(messageId);
}

async function migrateConversations() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables');
    Deno.exit(1);
  }
  
  console.log('🚀 Starting comprehensive conversation merge migration...');
  console.log(`📍 Supabase URL: ${supabaseUrl}\n`);
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // ============ PHASE 1: Backfill missing email identifiers ============
  console.log('📝 PHASE 1: Backfilling missing email_message_id and email_thread_id...');
  const { data: messagesNeedingBackfill, error: backfillFetchError } = await supabase
    .from('messages')
    .select('id, email_headers, email_message_id, email_thread_id')
    .not('email_headers', 'is', null)
    .or('email_message_id.is.null,email_thread_id.is.null');
  
  if (!backfillFetchError && messagesNeedingBackfill && messagesNeedingBackfill.length > 0) {
    console.log(`   Found ${messagesNeedingBackfill.length} messages needing backfill`);
    
    for (const msg of messagesNeedingBackfill as Message[]) {
      const messageId = getHeaderValue(msg.email_headers, 'Message-ID');
      const inReplyTo = getHeaderValue(msg.email_headers, 'In-Reply-To');
      const references = getHeaderValue(msg.email_headers, 'References');
      
      if (messageId) {
        const threadId = getCanonicalThreadId(messageId, inReplyTo, references);
        
        await supabase
          .from('messages')
          .update({
            email_message_id: messageId,
            email_thread_id: threadId
          })
          .eq('id', msg.id);
      }
    }
    console.log(`   ✅ Backfilled ${messagesNeedingBackfill.length} messages\n`);
  } else {
    console.log('   ✅ No messages need backfilling\n');
  }
  
  // ============ PHASE 2: Merge split HelpScout threads ============
  console.log('📥 PHASE 2: Analyzing HelpScout conversations for split threads...');
  const { data: conversations, error: conversationsError } = await supabase
    .from('conversations')
    .select('id, external_id, created_at, organization_id, messages!inner(id, created_at)')
    .not('external_id', 'is', null)
    .order('created_at', { ascending: true });
  
  if (conversationsError) {
    console.error('❌ Error fetching conversations:', conversationsError);
    Deno.exit(1);
  }
  
  console.log(`   Found ${conversations?.length || 0} conversations with external_id`);
  
  const helpScoutThreadGroups = new Map<string, Conversation[]>();
  const helpScoutPattern = /reply-(\d+)-(\d+)/;
  
  for (const conv of (conversations || []) as any[]) {
    const match = conv.external_id?.match(helpScoutPattern);
    
    if (match) {
      const threadId = `reply-${match[1]}-${match[2]}`;
      
      if (!helpScoutThreadGroups.has(threadId)) {
        helpScoutThreadGroups.set(threadId, []);
      }
      
      helpScoutThreadGroups.get(threadId)!.push(conv);
    }
  }
  
  console.log(`   Found ${helpScoutThreadGroups.size} unique HelpScout threads`);
  
  const splitHelpScoutThreads = new Map<string, Conversation[]>();
  
  for (const [threadId, convs] of helpScoutThreadGroups) {
    if (convs.length > 1) {
      splitHelpScoutThreads.set(threadId, convs);
      const messageCount = convs.reduce((sum, c) => sum + (c.messages?.length || 0), 0);
      console.log(`   🔴 Thread ${threadId} split across ${convs.length} conversations (${messageCount} messages)`);
    }
  }
  
  let mergedHelpScout = 0;
  if (splitHelpScoutThreads.size > 0) {
    console.log(`\n   Merging ${splitHelpScoutThreads.size} HelpScout threads...`);
    
    for (const [threadId, convs] of splitHelpScoutThreads) {
      try {
        const primary = convs.sort((a, b) => 
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )[0];
        
        const duplicateIds = convs.filter(c => c.id !== primary.id).map(c => c.id);
        
        // Reassign messages
        await supabase
          .from('messages')
          .update({ conversation_id: primary.id })
          .in('conversation_id', duplicateIds);
        
        // Update primary conversation
        await supabase
          .from('conversations')
          .update({ external_id: threadId })
          .eq('id', primary.id);
        
        // Delete duplicates
        await supabase
          .from('conversations')
          .delete()
          .in('id', duplicateIds);
        
        mergedHelpScout++;
        console.log(`   ✅ Merged thread ${threadId} (${duplicateIds.length} duplicates removed)`);
      } catch (error) {
        console.error(`   ❌ Failed to merge ${threadId}:`, error);
      }
    }
  } else {
    console.log('   ✅ No split HelpScout threads found');
  }
  
  // ============ PHASE 3: Merge split standard email threads ============
  console.log(`\n📥 PHASE 3: Analyzing standard email threads...`);
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
  
  console.log(`   Found ${messages?.length || 0} messages with email headers`);
  
  let mergedStandard = 0;
  let failedStandard = 0;
  
  if (!messages || messages.length === 0) {
    console.log('   ✨ No messages to process\n');
  } else {
    const threadGroups = new Map<string, Message[]>();
    let helpScoutCount = 0;
    let standardCount = 0;
    
    for (const msg of messages as Message[]) {
      const inReplyTo = getHeaderValue(msg.email_headers, 'In-Reply-To');
      const references = getHeaderValue(msg.email_headers, 'References');
      
      const canonicalThreadId = getCanonicalThreadId(
        msg.email_message_id!,
        inReplyTo,
        references
      );
      
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
    
    console.log(`   Computed thread IDs for ${messages.length} messages`);
    console.log(`   📧 HelpScout emails: ${helpScoutCount}`);
    console.log(`   📧 Standard emails: ${standardCount}`);
    console.log(`   🧵 Unique threads: ${threadGroups.size}`);
    
    const splitThreads = new Map<string, Message[]>();
    
    for (const [threadId, msgs] of threadGroups) {
      const conversationIds = new Set(msgs.map(m => m.conversation_id));
      if (conversationIds.size > 1) {
        splitThreads.set(threadId, msgs);
      }
    }
    
    console.log(`   Found ${splitThreads.size} split standard email threads`);
    
    if (splitThreads.size > 0) {
      console.log(`\n   Merging ${splitThreads.size} standard email threads...`);
      
      for (const [threadId, msgs] of splitThreads) {
        try {
          const conversationIds = Array.from(new Set(msgs.map(m => m.conversation_id)));
          
          const { data: convs, error: convError } = await supabase
            .from('conversations')
            .select('*')
            .in('id', conversationIds);
          
          if (convError || !convs || convs.length === 0) {
            failedStandard++;
            continue;
          }
          
          const primary = (convs as Conversation[]).sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )[0];
          
          const duplicateIds = conversationIds.filter(id => id !== primary.id);
          
          await supabase
            .from('messages')
            .update({ conversation_id: primary.id })
            .in('id', msgs.map(m => m.id));
          
          await supabase
            .from('conversations')
            .update({ 
              external_id: threadId,
              received_at: msgs.sort((a, b) => 
                new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              )[0].created_at
            })
            .eq('id', primary.id);
          
          await supabase
            .from('conversations')
            .delete()
            .in('id', duplicateIds);
          
          mergedStandard++;
        } catch (error) {
          console.error(`   ❌ Error:`, error);
          failedStandard++;
        }
      }
    }
  }
  
  // ============ SUMMARY ============
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ HelpScout threads merged: ${mergedHelpScout}`);
  console.log(`✅ Standard threads merged: ${mergedStandard || 0}`);
  console.log(`📧 Total messages processed: ${messages?.length || 0}`);
  console.log('='.repeat(60));
  console.log('\n✨ Migration completed successfully!');
}

// Run the migration
if (import.meta.main) {
  await migrateConversations();
}
