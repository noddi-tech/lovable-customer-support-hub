

# Show Bot Channel Membership Warnings in Routing UI

## Problem
When a channel is selected for routing, notifications silently fail with `not_in_channel` if the Slack bot hasn't been invited. The admin has no visibility into this until messages go missing.

## Approach
Add a lightweight channel-membership check that runs when a channel is selected. If the bot is not in the channel, show an inline warning with instructions to invite it.

## Implementation

### 1. New edge function endpoint or extend `slack-list-channels`
Extend the existing `slack-list-channels` function to also return `is_member` for each channel. The Slack `conversations.list` API already returns `is_member` on each channel object -- we just need to pass it through.

**File**: `supabase/functions/slack-list-channels/index.ts`
- Add `is_member: channel.is_member` to the channel object pushed into the array
- No new API calls needed

### 2. Update `SlackChannel` type
**File**: `src/hooks/useSlackIntegration.ts`
- Add `is_member: boolean` to the `SlackChannel` interface

### 3. Show warning in `InboxSlackRouting.tsx`
**File**: `src/components/admin/InboxSlackRouting.tsx`
- After the channel dropdown, check if the selected channel has `is_member === false`
- If so, render a small orange warning: "Bot not in channel -- invite the bot with `/invite @BotName` in Slack"
- Use the existing `AlertTriangle` icon already imported

### Files to change
1. `supabase/functions/slack-list-channels/index.ts` -- pass through `is_member`
2. `src/hooks/useSlackIntegration.ts` -- add `is_member` to `SlackChannel`
3. `src/components/admin/InboxSlackRouting.tsx` -- render warning when `is_member === false`

