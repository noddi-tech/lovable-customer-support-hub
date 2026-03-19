

## Fix Slack Mention Notifications: Remove Channel Post, Fix DM with Context

### Problems
1. **Channel notification fires on mention** — you don't want this; mentions should only send DM + email
2. **DM isn't working** — likely because Slack bots need `conversations.open` before DMing a user, and the current code skips that step
3. **DM lacks context** — no subject or conversation details, just a generic "mentioned you in a note"

### Plan

#### 1. Remove Slack channel notification for mentions
**File:** `supabase/functions/process-mention-notifications/index.ts`

Delete the entire `sendSlackChannelNotification` block (lines 353-368) inside the per-user loop, and remove the `slackChannelNotificationSent` variable and the helper function. Mentions should only trigger DM + email.

#### 2. Fix DM delivery — add `conversations.open` before posting
**File:** `supabase/functions/process-mention-notifications/index.ts`

Update `sendSlackDM` to first call `https://slack.com/api/conversations.open` with the user ID to get a DM channel ID, then post to that channel. This is required by Slack's API for bot-to-user DMs.

#### 3. Add conversation context to DM
**File:** `supabase/functions/process-mention-notifications/index.ts`

- After fetching `organizationId` from the conversation, also fetch `subject` and `customer_id`, then look up customer `name`/`email` from the `customers` table
- Pass `subject` and `customer_name` to `sendSlackDM`
- Update the DM blocks to include a context line like: `*Subject:* Re: Booking issue  |  *Customer:* John Doe`

#### 4. Await the DM call
The `sendSlackDM` call on line 375 is fire-and-forget (no `await`), so errors are silently lost. Add `await` so failures are logged properly.

### Files Changed
| File | Change |
|------|--------|
| `process-mention-notifications/index.ts` | Remove channel notification, fix DM with `conversations.open`, add subject/customer context, await DM call |

Edge function will need redeployment (automatic).

