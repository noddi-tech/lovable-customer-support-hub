/**
 * Retroactive Migration: Merge Split Conversations
 * 
 * This script identifies email threads that were incorrectly split into multiple
 * conversations due to the old threading logic, and merges them into single conversations.
 * 
 * Run with: deno run --allow-net --allow-env supabase/functions/merge-conversations-migration.ts
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface Message {
  id: string;
  conversation_id: string;
  email_message_id: string;
  email_headers: {
    from: string;
    to: string;
    inReplyTo?: string;
    references?: string;
  } | null;
  created_at: string;
}

interface Conversation {
  id: string;
  external_id: string;
  organization_id: string;
  received_at: string;
  created_at: string;
}

// Helper function to compute canonical thread ID (matches edge function logic)
function getCanonicalThreadId(
  messageId: string,
  inReplyTo?: string,
  references?: string
): string {
  const cleanId = (id: string) => id?.replace(/[<>]/g, "").trim();

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
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  console.log("🚀 Starting conversation merge migration...\n");

  // Step 1: Get all messages with email headers
  console.log("📧 Fetching all messages with email headers...");
  const { data: messages, error: messagesError } = await supabase
    .from("messages")
    .select("id, conversation_id, email_message_id, email_headers, created_at")
    .not("email_headers", "is", null)
    .not("email_message_id", "is", null)
    .order("created_at", { ascending: true });

  if (messagesError) {
    console.error("❌ Error fetching messages:", messagesError);
    return;
  }

  console.log(`✅ Found ${messages.length} messages with email headers\n`);

  // Step 2: Compute canonical thread IDs and group messages
  console.log("🔍 Computing canonical thread IDs...");
  const threadGroups = new Map<string, Message[]>();

  for (const msg of messages as Message[]) {
    const canonicalThreadId = getCanonicalThreadId(
      msg.email_message_id,
      msg.email_headers?.inReplyTo,
      msg.email_headers?.references
    );

    if (!threadGroups.has(canonicalThreadId)) {
      threadGroups.set(canonicalThreadId, []);
    }
    threadGroups.get(canonicalThreadId)!.push(msg);
  }

  console.log(`✅ Found ${threadGroups.size} unique threads\n`);

  // Step 3: Find threads with split conversations
  console.log("🔎 Identifying split conversations...");
  let splitThreadsCount = 0;
  let totalMessagesToReassign = 0;
  const threadsToMerge: Array<{
    canonicalThreadId: string;
    messages: Message[];
    conversationIds: Set<string>;
  }> = [];

  for (const [canonicalThreadId, msgs] of threadGroups) {
    const conversationIds = new Set(msgs.map((m) => m.conversation_id));

    if (conversationIds.size > 1) {
      splitThreadsCount++;
      totalMessagesToReassign += msgs.length;
      threadsToMerge.push({
        canonicalThreadId,
        messages: msgs,
        conversationIds,
      });
    }
  }

  console.log(
    `✅ Found ${splitThreadsCount} split threads affecting ${totalMessagesToReassign} messages\n`
  );

  if (splitThreadsCount === 0) {
    console.log("✨ No split conversations found. Migration complete!");
    return;
  }

  // Step 4: Process each split thread
  console.log("🔧 Starting merge process...\n");
  let mergedCount = 0;
  let failedCount = 0;

  for (const thread of threadsToMerge) {
    try {
      console.log(
        `\n📌 Processing thread: ${thread.canonicalThreadId.substring(0, 20)}...`
      );
      console.log(
        `   Messages: ${thread.messages.length}, Conversations: ${thread.conversationIds.size}`
      );

      // Get all conversations for this thread
      const { data: conversations, error: convsError } = await supabase
        .from("conversations")
        .select("id, external_id, organization_id, received_at, created_at")
        .in("id", Array.from(thread.conversationIds));

      if (convsError || !conversations || conversations.length === 0) {
        console.error("   ❌ Error fetching conversations:", convsError);
        failedCount++;
        continue;
      }

      // Choose primary conversation (oldest by received_at or created_at)
      const primaryConversation = conversations.reduce((oldest, current) => {
        const oldestDate = oldest.received_at || oldest.created_at;
        const currentDate = current.received_at || current.created_at;
        return new Date(currentDate) < new Date(oldestDate) ? current : oldest;
      });

      console.log(
        `   ✓ Primary conversation: ${primaryConversation.id.substring(0, 8)}...`
      );

      // Reassign all messages to primary conversation
      const messageIds = thread.messages.map((m) => m.id);
      const { error: updateMessagesError } = await supabase
        .from("messages")
        .update({
          conversation_id: primaryConversation.id,
          email_thread_id: thread.canonicalThreadId,
        })
        .in("id", messageIds);

      if (updateMessagesError) {
        console.error(
          "   ❌ Error updating messages:",
          updateMessagesError
        );
        failedCount++;
        continue;
      }

      console.log(`   ✓ Reassigned ${messageIds.length} messages`);

      // Update primary conversation's external_id and received_at
      const earliestMessageDate = thread.messages.reduce((earliest, msg) => {
        return new Date(msg.created_at) < new Date(earliest)
          ? msg.created_at
          : earliest;
      }, thread.messages[0].created_at);

      const { error: updateConvError } = await supabase
        .from("conversations")
        .update({
          external_id: thread.canonicalThreadId,
          received_at: earliestMessageDate,
          updated_at: new Date().toISOString(),
        })
        .eq("id", primaryConversation.id);

      if (updateConvError) {
        console.error(
          "   ❌ Error updating primary conversation:",
          updateConvError
        );
        failedCount++;
        continue;
      }

      console.log("   ✓ Updated primary conversation");

      // Delete duplicate conversations (that now have no messages)
      const duplicateConvIds = Array.from(thread.conversationIds).filter(
        (id) => id !== primaryConversation.id
      );

      if (duplicateConvIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("conversations")
          .delete()
          .in("id", duplicateConvIds);

        if (deleteError) {
          console.error(
            "   ⚠️  Warning: Could not delete duplicate conversations:",
            deleteError
          );
          // Don't fail the whole migration for this
        } else {
          console.log(
            `   ✓ Deleted ${duplicateConvIds.length} duplicate conversations`
          );
        }
      }

      mergedCount++;
      console.log(
        `   ✅ Successfully merged thread (${mergedCount}/${splitThreadsCount})`
      );
    } catch (error) {
      console.error(`   ❌ Error processing thread:`, error);
      failedCount++;
    }
  }

  // Step 5: Summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 MIGRATION SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total threads processed: ${splitThreadsCount}`);
  console.log(`Successfully merged: ${mergedCount}`);
  console.log(`Failed: ${failedCount}`);
  console.log(`Messages reassigned: ${totalMessagesToReassign}`);
  console.log("=".repeat(60) + "\n");

  if (mergedCount > 0) {
    console.log("✨ Migration completed successfully!");
    console.log("\n🔍 Run validation queries to verify:");
    console.log("   1. Check for orphaned messages");
    console.log("   2. Check for duplicate thread IDs");
    console.log("   3. Verify message counts");
  }
}

// Run migration
if (import.meta.main) {
  try {
    await migrateConversations();
  } catch (error) {
    console.error("💥 Fatal error:", error);
    Deno.exit(1);
  }
}
