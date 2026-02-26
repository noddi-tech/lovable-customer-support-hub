

## Fix Slack @Mentions to Use Real Slack Tags (Blue Clickable Text)

### Problem
Slack notifications show plain text names ("Bob Vu was mentioned") instead of real Slack @mentions (`<@U12345>`) that create clickable blue text and actually ping the user in Slack.

### Changes

#### 1. Resolve Slack user IDs upfront in `process-mention-notifications/index.ts`

Before processing individual notifications, batch-resolve all mentioned users' Slack IDs by email. Store a map of `userId -> slackUserId`.

```text
For each mentioned user:
  1. Get their email from profiles (already done)
  2. Call Slack users.lookupByEmail (already done in sendSlackDM)
  3. Store slackUserId in a map
```

#### 2. Update channel notification to use `<@SLACK_ID>` tags

**File: `supabase/functions/process-mention-notifications/index.ts`**

Instead of sending one `mentioned_user_name` string, collect all resolved Slack user IDs and build a string like `<@U123> <@U456>` for the channel post.

Change `sendSlackChannelNotification` to accept a `mentioned_slack_ids: string[]` parameter and format the channel notification with real Slack tags.

#### 3. Update `send-slack-notification/index.ts` to render Slack user tags

**File: `supabase/functions/send-slack-notification/index.ts`**

- Add a new field `mentioned_slack_ids?: string[]` to `SlackNotificationRequest`
- In the mention context block (line 302-312), use `<@ID>` format:
  ```
  // Before:  "Bob Vu was mentioned"  
  // After:   "<@U123ABC> <@U456DEF> were mentioned"
  ```
- In the fallback text (line 242-251), also include the Slack tags so native push notifications ping the users

#### 4. Update DM messages to tag the mentioner

**File: `supabase/functions/process-mention-notifications/index.ts`**

In `sendSlackDM`, also resolve the mentioner's Slack ID and use `<@MENTIONER_ID>` in the DM text so the recipient can see who tagged them as a clickable Slack mention.

### Implementation Detail

The key change in `process-mention-notifications/index.ts`:

```text
1. Collect all mentioned user emails + the mentioner email
2. Batch lookup all Slack IDs via users.lookupByEmail
3. Build slackMentionTags = resolved IDs mapped to "<@ID>" format
4. Pass tags to channel notification
5. Use mentioner's Slack ID in DM messages
```

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/process-mention-notifications/index.ts` | Resolve Slack IDs upfront, pass to channel notification, use in DMs |
| `supabase/functions/send-slack-notification/index.ts` | Accept `mentioned_slack_ids[]`, render `<@ID>` tags in mention blocks |

### Result

- Channel notification: "📣 `<@Bob>` `<@Robert>` were mentioned" (blue, clickable, pings them)
- DM: "`<@Joachim>` mentioned you in a note" (blue, clickable)
- Native Slack push notifications will also ping tagged users

