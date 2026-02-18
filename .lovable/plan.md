
# Fix: Sidebar Filter Counters Always Showing Zero

## Root Cause

Both database functions `get_inbox_counts` and `get_all_counts` have a **column name mismatch** between their declared return types and the actual SELECT aliases. PostgreSQL returns 0 for every column because the names don't match.

**Example from `get_inbox_counts`:**
- Declared return column: `conversations_all`
- Actual SELECT alias: `total`

Since PostgreSQL maps by name for declared return types, every counter resolves to 0.

## The Fix

One database migration to update both functions, changing the SELECT aliases to match the declared return column names:

| Current Alias | Required Alias |
|---|---|
| `total` | `conversations_all` |
| `open_count` | `conversations_open` |
| `unread_count` | `conversations_unread` |
| `assigned_count` | `conversations_assigned` |
| `pending_count` | `conversations_pending` |
| `closed_count` | `conversations_closed` |
| `archived_count` | `conversations_archived` |
| `deleted_count` | `conversations_deleted` |
| `email_count` | `channels_email` |
| `facebook_count` | `channels_facebook` |
| `instagram_count` | `channels_instagram` |
| `whatsapp_count` | `channels_whatsapp` |
| `unread_notifs` | `notifications_unread` |

No frontend code changes are needed -- the frontend already expects the correct names. The fix is entirely in SQL.

## Technical Details

**Migration: Fix `get_inbox_counts` and `get_all_counts` column aliases**

Both functions will be recreated with `CREATE OR REPLACE FUNCTION`, updating every SELECT alias to match the declared return type. For `get_all_counts`, the CTE aliases and final SELECT will also be updated, plus `COALESCE(id.data, '[]'::jsonb)` will be aliased as `inboxes_data`.

This is a safe, non-breaking change -- only the internal aliases change; the return type declaration stays identical.
