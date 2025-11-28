import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

const HELPSCOUT_APP_ID = Deno.env.get('HELPSCOUT_APP_ID');
const HELPSCOUT_APP_SECRET = Deno.env.get('HELPSCOUT_APP_SECRET');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const MAX_EXECUTION_TIME = 45000; // 45 seconds (leave 15s buffer before 60s timeout)
const MAX_CONTINUATIONS = 50; // Prevent infinite loops

interface ImportProgress {
  totalMailboxes: number;
  totalConversations: number;
  conversationsImported: number;
  conversationsProcessed: number;
  conversationsSkipped: number;
  messagesImported: number;
  customersImported: number;
  errors: string[];
  status: 'running' | 'completed' | 'error' | 'paused';
}

interface ImportCheckpoint {
  mailboxIds: string[];
  mailboxMapping: Record<string, string>;
  dateFrom?: string;
  currentMailboxIndex: number;
  currentPage: number;
  processedConvIds: string[];
  resolvedInboxIds: Record<string, string>;
  completedMailboxIds: string[];
  completedPages: Record<string, number>; // mailboxId -> last completed page
  continuationCount: number;
}

// OAuth2 token exchange
async function getAccessToken(): Promise<string> {
  const tokenResponse = await fetch('https://api.helpscout.net/v2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: HELPSCOUT_APP_ID,
      client_secret: HELPSCOUT_APP_SECRET,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`Failed to authenticate: ${tokenResponse.statusText}`);
  }

  const tokenData = await tokenResponse.json();
  return tokenData.access_token;
}

// Fetch data from HelpScout with rate limiting
async function fetchHelpScout(
  accessToken: string,
  endpoint: string,
  retries = 3
): Promise<any> {
  const url = `https://api.helpscout.net/v2${endpoint}`;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
      console.log(`Rate limited. Waiting ${retryAfter}s before retry ${attempt + 1}/${retries}`);
      await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
      continue;
    }

    if (!response.ok) {
      console.error(`HelpScout API error: ${response.status} ${response.statusText}`);
      if (attempt === retries - 1) {
        throw new Error(`HelpScout API error: ${response.status}`);
      }
      await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
      continue;
    }

    return await response.json();
  }

  throw new Error('Max retries exceeded');
}

// Import a customer
async function importCustomer(
  supabase: any,
  organizationId: string,
  customerData: any
): Promise<{ customerId: string | null; isNew: boolean }> {
  if (!customerData?.email && !customerData?.phone) {
    return { customerId: null, isNew: false };
  }

  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('organization_id', organizationId)
    .or(`email.eq.${customerData.email || ''},phone.eq.${customerData.phone || ''}`)
    .single();

  if (existing) {
    return { customerId: existing.id, isNew: false };
  }

  const { data, error } = await supabase
    .from('customers')
    .insert({
      organization_id: organizationId,
      email: customerData.email,
      full_name: `${customerData.firstName || ''} ${customerData.lastName || ''}`.trim() || customerData.email,
      phone: customerData.phone,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating customer:', error);
    return { customerId: null, isNew: false };
  }

  return { customerId: data.id, isNew: true };
}

// Import conversation with messages
async function importConversation(
  supabase: any,
  accessToken: string,
  organizationId: string,
  inboxId: string,
  conversation: any,
  progress: ImportProgress
): Promise<void> {
  try {
    // Check if conversation already exists
    const externalId = `helpscout_${conversation.id}`;
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('external_id', externalId)
      .single();

    if (existingConv) {
      console.log(`Conversation ${conversation.id} already imported, skipping`);
      progress.conversationsProcessed++;
      progress.conversationsSkipped++;
      return;
    }

    // Import customer
    const { customerId, isNew } = await importCustomer(supabase, organizationId, conversation.primaryCustomer);
    if (isNew) {
      progress.customersImported++;
    }
    
    // Create conversation
    const { data: newConv, error: convError } = await supabase
      .from('conversations')
      .insert({
        organization_id: organizationId,
        inbox_id: inboxId,
        customer_id: customerId,
        external_id: externalId,
        subject: conversation.subject || 'No subject',
        status: conversation.status === 'active' ? 'open' : conversation.status === 'closed' ? 'closed' : 'pending',
        channel: 'email',
        priority: 'normal',
        created_at: conversation.createdAt,
        updated_at: conversation.userUpdatedAt || conversation.createdAt,
        received_at: conversation.createdAt,
      })
      .select('id')
      .single();

    if (convError) {
      progress.errors.push(`Failed to import conversation ${conversation.id}: ${convError.message}`);
      return;
    }

    progress.conversationsImported++;
    progress.conversationsProcessed++;

    // Fetch and import threads (messages)
    const threadsData = await fetchHelpScout(accessToken, `/conversations/${conversation.id}/threads`);
    const threads = threadsData._embedded?.threads || [];

    for (const thread of threads) {
      if (thread.type !== 'message' && thread.type !== 'customer' && thread.type !== 'note') {
        continue;
      }

      const { error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: newConv.id,
          external_id: `helpscout_thread_${thread.id}`,
          content: thread.body || '',
          sender_type: thread.type === 'customer' ? 'customer' : 'agent',
          sender_id: customerId,
          created_at: thread.createdAt,
          is_internal: thread.type === 'note',
          content_type: 'html',
        });

      if (msgError) {
        console.error(`Error importing thread ${thread.id}:`, msgError);
      } else {
        progress.messagesImported++;
      }
    }

    console.log(`Imported conversation ${conversation.id} with ${threads.length} messages`);
  } catch (error) {
    progress.errors.push(`Error importing conversation ${conversation.id}: ${error.message}`);
    console.error(`Error importing conversation ${conversation.id}:`, error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { organizationId, mailboxIds, dateFrom, preview, test, mailboxMapping, resume, jobId: existingJobId } = await req.json();

    // Test mode - just verify credentials
    if (test) {
      try {
        const accessToken = await getAccessToken();
        return new Response(
          JSON.stringify({ success: true, message: 'Credentials are valid' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ error: 'Invalid credentials' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Preview mode - fetch mailboxes only
    if (preview) {
      try {
        const accessToken = await getAccessToken();
        const mailboxesData = await fetchHelpScout(accessToken, '/mailboxes');
        const mailboxes = (mailboxesData._embedded?.mailboxes || []).map((mb: any) => ({
          id: mb.id,
          name: mb.name,
          email: mb.email,
        }));
        
        return new Response(
          JSON.stringify({ mailboxes }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    let jobId: string;
    let checkpoint: ImportCheckpoint | null = null;
    let effectiveOrganizationId = organizationId;

    // Resume mode - load existing job FIRST to get organizationId
    if (resume && existingJobId) {
      const { data: existingJob } = await supabase
        .from('import_jobs')
        .select('*')
        .eq('id', existingJobId)
        .single();
      
      if (!existingJob) {
        return new Response(
          JSON.stringify({ error: 'Job not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      jobId = existingJobId;
      checkpoint = existingJob.metadata?.checkpoint;
      effectiveOrganizationId = existingJob.organization_id; // Use from job!

      console.log(`Resuming import job: ${jobId} at mailbox ${checkpoint?.currentMailboxIndex}, page ${checkpoint?.currentPage}`);
    } else {
      // Create new import job - now need organizationId
      if (!effectiveOrganizationId) {
        return new Response(
          JSON.stringify({ error: 'organizationId is required for new imports' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: job, error: jobError } = await supabase
        .from('import_jobs')
        .insert({
          organization_id: effectiveOrganizationId,
          source: 'helpscout',
          status: 'running',
          started_at: new Date().toISOString(),
          metadata: {
            dateFrom,
            mailboxMappingCount: Object.keys(mailboxMapping || {}).length
          }
        })
        .select('id')
        .single();

      if (jobError || !job) {
        console.error('Failed to create import job:', jobError);
        return new Response(
          JSON.stringify({ error: 'Failed to create import job' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      jobId = job.id;
      console.log(`Created import job: ${jobId}`);
    }
    
    const progress: ImportProgress = {
      totalMailboxes: 0,
      totalConversations: 0,
      conversationsImported: 0,
      conversationsProcessed: 0,
      conversationsSkipped: 0,
      messagesImported: 0,
      customersImported: 0,
      errors: [],
      status: 'running',
    };

    // Start background task
    EdgeRuntime.waitUntil((async () => {
      const startTime = Date.now();
      
      const shouldPause = (): boolean => {
        return Date.now() - startTime > MAX_EXECUTION_TIME;
      };

      try {
        console.log('Starting HelpScout import...');
        const accessToken = await getAccessToken();
        console.log('Authenticated with HelpScout');

        // Load existing progress if resuming
        if (checkpoint) {
          const { data: existingJob } = await supabase
            .from('import_jobs')
            .select('*')
            .eq('id', jobId)
            .single();
          
          if (existingJob) {
            progress.totalMailboxes = existingJob.total_mailboxes || checkpoint.mailboxIds?.length || 0;
            progress.totalConversations = existingJob.total_conversations || 0;
            progress.conversationsImported = existingJob.conversations_imported || 0;
            progress.conversationsProcessed = existingJob.metadata?.progress?.conversationsProcessed || 0;
            progress.conversationsSkipped = existingJob.metadata?.progress?.conversationsSkipped || 0;
            progress.messagesImported = existingJob.messages_imported || 0;
            progress.customersImported = existingJob.customers_imported || 0;
          }
        }

        // Fetch mailboxes
        const mailboxesData = await fetchHelpScout(accessToken, '/mailboxes');
        const mailboxes = mailboxesData._embedded?.mailboxes || [];
        
        if (!checkpoint) {
          progress.totalMailboxes = mailboxes.length;
        }

        console.log(`Found ${mailboxes.length} mailboxes`);

        // Get mailbox IDs and mapping (from checkpoint or request)
        const targetMailboxIds = checkpoint?.mailboxIds || mailboxIds;
        const effectiveMapping = checkpoint?.mailboxMapping || mailboxMapping;

        // Filter mailboxes if specified
        const targetMailboxes = targetMailboxIds?.length > 0
          ? mailboxes.filter((mb: any) => targetMailboxIds.includes(mb.id))
          : mailboxes;

        // Resume state
        const startMailboxIndex = checkpoint?.currentMailboxIndex || 0;
        const startPage = checkpoint?.currentPage || 1;
        const skipConvIds = new Set(checkpoint?.processedConvIds || []);
        const resolvedInboxIds = checkpoint?.resolvedInboxIds || {};
        const completedMailboxIds = new Set(checkpoint?.completedMailboxIds || []);
        const completedPages = checkpoint?.completedPages || {};
        const continuationCount = checkpoint?.continuationCount || 0;

        // Check continuation limit
        if (continuationCount >= MAX_CONTINUATIONS) {
          throw new Error('Maximum continuation limit reached - possible infinite loop detected');
        }

        // Process mailboxes
        for (let mIdx = startMailboxIndex; mIdx < targetMailboxes.length; mIdx++) {
          const mailbox = targetMailboxes[mIdx];
          
          // Skip if mailbox already fully processed
          if (completedMailboxIds.has(mailbox.id)) {
            console.log(`Mailbox ${mailbox.name} (${mailbox.id}) already completed, skipping to next`);
            continue;
          }
          
          const targetInboxId = effectiveMapping?.[mailbox.id];
          
          if (!targetInboxId || targetInboxId === 'skip') {
            console.log(`Skipping mailbox: ${mailbox.name}`);
            completedMailboxIds.add(mailbox.id);
            continue;
          }

          console.log(`Processing mailbox ${mIdx + 1}/${targetMailboxes.length}: ${mailbox.name}`);

          // Get or create inbox
          let inboxId = resolvedInboxIds[mailbox.id];
          
          if (!inboxId) {
            if (targetInboxId === 'create_new') {
              const { data: newInbox, error: inboxError } = await supabase
                .from('inboxes')
                .insert({
                  organization_id: organizationId,
                  name: mailbox.name,
                  description: `Imported from HelpScout`,
                  is_active: true,
                })
                .select('id')
                .single();
              
              if (inboxError || !newInbox) {
                progress.errors.push(`Failed to create inbox for mailbox ${mailbox.name}`);
                continue;
              }
              inboxId = newInbox.id;
            } else {
              inboxId = targetInboxId;
            }
            
            resolvedInboxIds[mailbox.id] = inboxId;
          }

          if (!inboxId) {
            progress.errors.push(`No inbox ID for mailbox ${mailbox.name}`);
            continue;
          }

          // Fetch conversations for this mailbox
          let page = (mIdx === startMailboxIndex) ? startPage : 1;
          let hasMore = true;
          const processedOnPage: string[] = [];
          let consecutiveSkippedPages = 0;
          let newImportsOnPage = 0;

          while (hasMore) {
            // Check if we should pause BEFORE fetching
            if (shouldPause()) {
              console.log(`Pausing at mailbox ${mIdx}, page ${page} after ${Date.now() - startTime}ms`);
              
              // Save checkpoint
              await supabase
                .from('import_jobs')
                .update({
                  status: 'paused',
                  conversations_imported: progress.conversationsImported,
                  messages_imported: progress.messagesImported,
                  customers_imported: progress.customersImported,
                  metadata: {
                    dateFrom: checkpoint?.dateFrom || dateFrom,
                    mailboxMappingCount: Object.keys(effectiveMapping || {}).length,
                    progress: {
                      conversationsProcessed: progress.conversationsProcessed,
                      conversationsSkipped: progress.conversationsSkipped,
                    },
                    checkpoint: {
                      mailboxIds: targetMailboxIds,
                      mailboxMapping: effectiveMapping,
                      dateFrom: checkpoint?.dateFrom || dateFrom,
                      currentMailboxIndex: mIdx,
                      currentPage: page,
                        processedConvIds: processedOnPage,
                        resolvedInboxIds,
                        completedMailboxIds: Array.from(completedMailboxIds),
                        completedPages,
                        continuationCount: continuationCount + 1,
                    }
                  }
                })
                .eq('id', jobId);
              
              // Self-invoke for continuation
              console.log('Triggering self-continuation...');
              EdgeRuntime.waitUntil(
                fetch(`${SUPABASE_URL}/functions/v1/helpscout-import`, {
                  method: 'POST',
                  headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
                  },
                  body: JSON.stringify({
                    // Don't need to pass organizationId - will be fetched from job
                    resume: true,
                    jobId,
                  })
                })
              );
              
              return; // Exit current invocation
            }

            let endpoint = `/conversations?mailbox=${mailbox.id}&page=${page}&status=all`;
            if (checkpoint?.dateFrom || dateFrom) {
              endpoint += `&modifiedSince=${checkpoint?.dateFrom || dateFrom}`;
            }

            const conversationsData = await fetchHelpScout(accessToken, endpoint);
            const conversations = conversationsData._embedded?.conversations || [];
            
            // Reset counter for new imports on this page
            newImportsOnPage = 0;
            
            if (conversations.length === 0) {
              hasMore = false;
              completedMailboxIds.add(mailbox.id);
              completedPages[mailbox.id] = page;
              console.log(`Mailbox ${mailbox.name} completed (no more conversations)`);
              break;
            }

            if (!checkpoint || mIdx !== startMailboxIndex || page !== startPage) {
              progress.totalConversations += conversations.length;
            }
            
            // Update total in database
            await supabase
              .from('import_jobs')
              .update({ 
                total_conversations: progress.totalConversations,
                total_mailboxes: progress.totalMailboxes
              })
              .eq('id', jobId);

            // Import each conversation
            for (const conversation of conversations) {
              // Skip already processed conversations on first resumed page
              if (mIdx === startMailboxIndex && page === startPage && skipConvIds.has(conversation.id)) {
                console.log(`Skipping already processed conversation ${conversation.id}`);
                continue;
              }

              // Check pause again before processing each conversation
              if (shouldPause()) {
                console.log(`Pausing mid-page at mailbox ${mIdx}, page ${page}, conv ${conversation.id}`);
                
                await supabase
                  .from('import_jobs')
                  .update({
                    status: 'paused',
                    conversations_imported: progress.conversationsImported,
                    messages_imported: progress.messagesImported,
                    customers_imported: progress.customersImported,
                    metadata: {
                      dateFrom: checkpoint?.dateFrom || dateFrom,
                      mailboxMappingCount: Object.keys(effectiveMapping || {}).length,
                      progress: {
                        conversationsProcessed: progress.conversationsProcessed,
                        conversationsSkipped: progress.conversationsSkipped,
                      },
                      checkpoint: {
                        mailboxIds: targetMailboxIds,
                        mailboxMapping: effectiveMapping,
                        dateFrom: checkpoint?.dateFrom || dateFrom,
                        currentMailboxIndex: mIdx,
                        currentPage: page,
                        processedConvIds: processedOnPage,
                        resolvedInboxIds,
                        completedMailboxIds: Array.from(completedMailboxIds),
                        completedPages,
                        continuationCount: continuationCount + 1,
                      }
                    }
                  })
                  .eq('id', jobId);
                
                EdgeRuntime.waitUntil(
                  fetch(`${SUPABASE_URL}/functions/v1/helpscout-import`, {
                    method: 'POST',
                    headers: { 
                      'Content-Type': 'application/json',
                      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`
                    },
                    body: JSON.stringify({
                      organizationId,
                      resume: true,
                      jobId,
                    })
                  })
                );
                
                return;
              }

              const beforeImportCount = progress.conversationsImported;
              
              await importConversation(
                supabase,
                accessToken,
                organizationId,
                inboxId,
                conversation,
                progress
              );
              
              // Track if this was a new import (not skipped)
              if (progress.conversationsImported > beforeImportCount) {
                newImportsOnPage++;
              }
              
              processedOnPage.push(conversation.id);
              
              // Update progress every 5 conversations
              if (progress.conversationsProcessed % 5 === 0) {
                await supabase
                  .from('import_jobs')
                  .update({
                    conversations_imported: progress.conversationsImported,
                    messages_imported: progress.messagesImported,
                    customers_imported: progress.customersImported,
                    metadata: {
                      ...(await supabase.from('import_jobs').select('metadata').eq('id', jobId).single()).data?.metadata,
                      progress: {
                        conversationsProcessed: progress.conversationsProcessed,
                        conversationsSkipped: progress.conversationsSkipped,
                      }
                    }
                  })
                  .eq('id', jobId);
                
                console.log(`Progress: ${progress.conversationsProcessed} processed (${progress.conversationsImported} new, ${progress.conversationsSkipped} skipped)/${progress.totalConversations}`);
              }
            }

            // Clear skip list after first resumed page
            if (mIdx === startMailboxIndex && page === startPage) {
              skipConvIds.clear();
            }

            // Track consecutive pages with no new imports
            if (newImportsOnPage === 0) {
              consecutiveSkippedPages++;
            } else {
              consecutiveSkippedPages = 0;
            }

            // Check if there are more pages
            hasMore = conversationsData.page?.number < conversationsData.page?.totalPages;
            
            // Mark page as completed
            completedPages[mailbox.id] = page;
            
            // Mark mailbox as complete if:
            // 1. No more pages, OR
            // 2. We've processed 3+ consecutive pages with no new imports (all already exist)
            if (!hasMore || (consecutiveSkippedPages >= 3 && conversations.length > 0)) {
              completedMailboxIds.add(mailbox.id);
              if (!hasMore) {
                console.log(`Mailbox ${mailbox.name} completed after page ${page} (last page)`);
              } else {
                console.log(`Mailbox ${mailbox.name} completed early - ${consecutiveSkippedPages} consecutive pages with all conversations already imported`);
              }
              hasMore = false; // Force exit from loop
            }
            
            page++;
            processedOnPage.length = 0; // Clear for next page

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 150));
          }
        }

        // Final progress update - completed
        await supabase
          .from('import_jobs')
          .update({
            status: 'completed',
            conversations_imported: progress.conversationsImported,
            messages_imported: progress.messagesImported,
            customers_imported: progress.customersImported,
            completed_at: new Date().toISOString()
          })
          .eq('id', jobId);
        
        progress.status = 'completed';
        console.log('Import completed successfully', progress);
      } catch (error) {
        // Update job with error
        await supabase
          .from('import_jobs')
          .update({
            status: 'error',
            errors: [...progress.errors, { message: error.message, timestamp: new Date().toISOString() }],
            completed_at: new Date().toISOString()
          })
          .eq('id', jobId);
        
        progress.status = 'error';
        progress.errors.push(error.message);
        console.error('Import failed:', error);
      }
    })());

    // Return immediate response with job ID
    return new Response(
      JSON.stringify({
        status: resume ? 'resumed' : 'started',
        jobId,
        message: resume ? 'Import resumed in background' : 'Import started in background'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error starting import:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
