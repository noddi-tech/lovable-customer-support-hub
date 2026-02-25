

## Add `email_status` to Database Queries for Inline Warning

### Problem

The inline "Email not sent" warning and Resend button were added to the UI, but they never appear because `email_status` is not included in the database `select` columns. The normalization code reads `rawMessage.email_status`, but the field is always `undefined` since it's never fetched.

### Fix

Add `email_status` to the select columns in all three query locations:

#### 1. `src/hooks/conversations/useThreadMessages.ts`

**Line 70 (seed query)**: Add `email_status` to the select string.

**Line 98 (main query)**: Add `email_status` to the select string.

#### 2. `src/hooks/conversations/useConversationMessages.ts`

**Lines 105-108**: Add `email_status` to the select string, changing:
```
id, content, content_type, sender_type, sender_id, 
is_internal, attachments, created_at, email_subject, email_headers, 
external_id, email_message_id
```
to:
```
id, content, content_type, sender_type, sender_id, 
is_internal, attachments, created_at, email_subject, email_headers, 
external_id, email_message_id, email_status
```

### Result

After this fix, `email_status` will flow from the database through normalization to the UI, and agent messages with `failed`/`pending`/`retry` status will show the inline warning with the Resend button.

