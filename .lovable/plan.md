

# Fix: "Assigned to Me" Shows Count But No Conversations

## Root Cause

The `assigned_to_id` column in the `conversations` table stores `profiles.id` (the profile primary key). However, two RPC functions join on the wrong column:

- `get_conversations_with_session_recovery`: `LEFT JOIN profiles p ON c.assigned_to_id = p.user_id` -- WRONG
- `get_conversations`: `LEFT JOIN profiles p ON c.assigned_to_id = p.user_id` -- WRONG

The correct join is `ON c.assigned_to_id = p.id`.

Because the join fails silently (LEFT JOIN), `assigned_to` comes back as NULL for every conversation. The client-side "Assigned to Me" filter then compares `null === currentUserProfileId` and finds zero matches.

The count functions (`get_all_counts`, `get_inbox_counts`) correctly compare `assigned_to_id = v_profile_id` (where `v_profile_id = profiles.id`), so the sidebar counter shows the right number.

Additionally, `get_conversations` has a second bug: its `assigned` filter uses `c.assigned_to_id = auth.uid()` instead of comparing against the profile ID.

## Fix

**Single migration** to recreate both functions with the corrected join:

1. **`get_conversations_with_session_recovery`**: Change line `LEFT JOIN public.profiles p ON c.assigned_to_id = p.user_id` to `LEFT JOIN public.profiles p ON c.assigned_to_id = p.id`

2. **`get_conversations`**: Same join fix (`p.user_id` to `p.id`), plus fix the assigned filter from `c.assigned_to_id = auth.uid()` to use profile ID lookup.

### Files to create
- `supabase/migrations/[timestamp]_fix_assigned_to_join.sql` — single migration with both function replacements

