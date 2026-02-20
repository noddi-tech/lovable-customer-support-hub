

# Add Attachments to Reply Messages

## Problem

The reply area has no way to attach files when composing replies. The infrastructure partially exists (a `message-attachments` storage bucket, an `attachments` JSONB column on `messages`, and the `send-reply-email` Edge Function), but the UI is missing and the Edge Function doesn't include attachments in outgoing emails.

## What Will Be Built

1. **Attachment picker UI** in the ReplyArea (paperclip button, file previews with remove, drag-and-drop)
2. **Upload files** to the existing `message-attachments` Supabase Storage bucket
3. **Store attachment metadata** in the `messages.attachments` JSONB column (same format as inbound emails)
4. **Send attachments with outgoing emails** via SendGrid's attachment API
5. **Storage policy** so authenticated agents can upload files

## Technical Details

### 1. Storage RLS Policy (SQL migration)

The `message-attachments` bucket currently only allows INSERT for service role. Add a policy so authenticated users (agents) can upload:

```sql
CREATE POLICY "Authenticated users can upload attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'message-attachments');
```

### 2. ReplyArea UI Changes (`src/components/dashboard/conversation-view/ReplyArea.tsx`)

- Add a `Paperclip` icon button (already imported as `lucide-react` icon) next to the Translate button
- Add local state: `attachments: { file: File; previewUrl: string }[]`
- File input (hidden) triggered by the paperclip button, accepting multiple files
- Render attachment preview chips below the toolbar (filename, size, remove button)
- Pass attachments array into `sendReply()`

### 3. ConversationViewContext Changes (`src/contexts/ConversationViewContext.tsx`)

- Update `sendReply` signature to accept optional attachments: `sendReply(content, isInternal, status, attachments?)`
- In `sendReplyMutation`:
  - Upload each file to `message-attachments` bucket under `{org_id}/{conversation_id}/{uuid}_{filename}`
  - Build attachment metadata array matching the existing `EmailAttachment` format:
    ```json
    { "filename": "doc.pdf", "mimeType": "application/pdf", "size": 12345, "storageKey": "org/.../doc.pdf", "isInline": false }
    ```
  - Include attachments in the message INSERT

### 4. send-reply-email Edge Function (`supabase/functions/send-reply-email/index.ts`)

- After building the SendGrid payload, check `message.attachments`
- For each attachment with a `storageKey`, download from `message-attachments` bucket
- Convert to base64 and add to SendGrid's `attachments` array:
  ```json
  { "content": "<base64>", "filename": "doc.pdf", "type": "application/pdf", "disposition": "attachment" }
  ```

### 5. File Structure

No new files needed. Changes to:

| File | Change |
|---|---|
| SQL migration | Add upload RLS policy for `message-attachments` |
| `ReplyArea.tsx` | Paperclip button, file state, preview chips |
| `ConversationViewContext.tsx` | Upload files to storage, attach metadata to message |
| `send-reply-email/index.ts` | Download attachments from storage and include in SendGrid payload |

### Constraints

- Max file size: 10MB per file (SendGrid limit is 30MB total)
- Reuses existing `message-attachments` bucket and `messages.attachments` JSONB column
- Attachment format matches inbound email attachments for consistency
