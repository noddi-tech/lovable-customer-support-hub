
Fix the problem as a misclassification bug first, not an echo-only bug.

### What’s actually happening
The thread still shows “customer inbound” cards even when they are really forwarded copies of agent replies because:
1. `sendgrid-inbound` stores every parsed inbound email as `sender_type: "customer"`.
2. `normalizeMessage` only flips a message to outbound/agent when it can prove the sender from parsed headers belongs to an agent/domain.
3. For forwarded Google Groups copies, the stored `email_headers` often only contain `{ raw }`, while `normalizeMessage` currently prefers `From` / `Sender` / `Reply-To` in a way that can miss the real author or still look like a customer message.
4. So the UI sees a forwarded copy as `direction: "inbound"` and the echo filter never catches some cases correctly.

I also checked the actual conversation data: the “customer” rows in this thread are real customer emails, while the agent rows are separate. So the next fix should target the misclassified forwarded agent copies globally rather than assuming every duplicate-looking inbound is a customer echo.

### Plan
1. Strengthen normalization in `src/lib/normalizeMessage.ts`
   - Add explicit resolver for raw headers:
     - `Reply-To`
     - `X-Original-From` / `X-Google-Original-From`
     - `Sender`
     - `From`
   - Detect Google Groups/list forwarding patterns.
   - If headers indicate the real author is an agent-domain address, force:
     - `authorType = 'agent'`
     - `direction = 'outbound'`
   - Do not rely on DB `sender_type` alone for email messages.

2. Make thread echo filtering compare against earlier messages, not just outbound rows
   - Update `src/hooks/conversations/useThreadMessagesList.ts`
   - For each inbound-looking email, compare its normalized body against earlier messages in the same thread.
   - If it contains a substantial snippet of an earlier message and header metadata suggests list forwarding, filter it.
   - This catches forwarded copies even when the message was initially normalized wrong.

3. Update the cleanup edge function to use the same author-resolution rules
   - In `supabase/functions/cleanup-forwarding-echoes/index.ts`
   - Reuse the broader forwarding heuristics:
     - earlier-message substring match
     - raw-header group-forward detection
     - not just “agent row within time window”
   - This makes cleanup work on old data too.

4. Add a dedicated backfill/fix path for old misclassified rows
   - Either extend the cleanup function or add a small companion edge function.
   - For existing email messages that were inserted as `sender_type = 'customer'` but raw headers prove they are forwarded agent copies:
     - delete them if they are pure echoes
     - or mark/report them in dry-run mode first
   - Keep dry-run as default.

5. Add focused regression tests
   - `normalizeMessage` test for Google Groups forwarded agent email stored with `sender_type='customer'`
   - thread filter test where only agent-origin content exists but a forwarded copy appears as inbound
   - cleanup test for old conversations with raw forwarded headers

### Files to update
- `src/lib/normalizeMessage.ts`
- `src/hooks/conversations/useThreadMessagesList.ts`
- `supabase/functions/cleanup-forwarding-echoes/index.ts`
- tests near conversations/normalization utilities

### Technical details
```text
Current failure:
DB row says sender_type=customer
        +
headers/raw forwarding metadata not fully resolved
        ->
normalizeMessage marks inbound/customer
        ->
echo filter misses or behaves inconsistently

Target behavior:
raw forwarded headers resolved to real author
        ->
agent-domain sender recognized
        ->
message normalized as outbound/agent
        ->
duplicate forwarded copy filtered consistently
        ->
same logic available for historical cleanup
```

### Expected result
- Agent replies forwarded back through Google Groups will stop appearing as fake customer messages.
- Existing bad rows can be cleaned up safely with a dry-run first.
- Real customer emails remain visible.
