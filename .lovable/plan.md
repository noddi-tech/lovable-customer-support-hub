

## Fix Two Issues: Email Encoding & Noisy Critical Alerts

### Issue 1: Norwegian characters still broken (ø, æ, å → `�`)

**Root cause:** The `gmail-sync` encoding fix was added to the code but the edge function may not have been successfully redeployed, OR the message shown was synced before deployment. Additionally, existing messages already stored with `�` in the database will continue to show corruption — they need to be re-decoded.

**Fix:**
- **Redeploy `gmail-sync`** to ensure the encoding fix is live
- **Add a secondary UTF-8 re-decode attempt** in `gmail-sync`: when charset is `us-ascii` or `iso-8859-1`, always try UTF-8 first (since nearly all modern emails are UTF-8). Only fall back to the declared charset if UTF-8 produces more replacement characters
- **Re-sync affected messages**: Trigger a re-sync for messages that contain `�` so they get re-fetched and properly decoded from Gmail's raw data

**File:** `supabase/functions/gmail-sync/index.ts`
- In `getDecodedEmailContent`: When charset is NOT utf-8, decode as UTF-8 **first**. If the UTF-8 result has fewer `\uFFFD` chars than the declared-charset result, use UTF-8. This handles the common case where Gmail headers say `us-ascii` but the actual content is UTF-8.

### Issue 2: Critical alerts fire on every customer reply (too noisy)

**Root cause:** In `send-slack-notification/index.ts`, the critical triage block (line 446) runs on every `customer_reply` event with no dedup. If the conversation subject contains "feil" (a keyword), every new reply fires another critical alert to the `#tech` channel.

**Fix:** Add a dedup check — before posting a critical alert, query the Slack `conversations.history` or (simpler) track in the database. The simplest approach: check if a critical alert notification was already sent for this `conversation_id` in the last 24 hours by querying the `notifications` table or adding a lightweight tracking mechanism.

**File:** `supabase/functions/send-slack-notification/index.ts`
- Before the `shouldAlert` block, query `notifications` for an existing critical alert for this `conversation_id` in the last 24 hours
- If one exists, skip the critical alert entirely
- After sending a critical alert successfully, insert a tracking record into `notifications` with `type: 'critical_alert_sent'` and `data.conversation_id`
- This ensures each conversation only triggers one critical alert, regardless of how many replies match keywords

### Files Changed

| File | Change |
|------|--------|
| `gmail-sync/index.ts` | Prefer UTF-8 decode when declared charset is ascii/latin1; redeploy |
| `send-slack-notification/index.ts` | Add 24h dedup check per conversation_id before posting critical alerts; redeploy |

### Deployment
Both edge functions will be redeployed automatically.

