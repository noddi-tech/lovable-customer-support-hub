## Fix: avif uploads + abort-on-upload-failure in reply send

Two-part change. Bucket allowlist gets `image/avif`. The reply mutation in `ConversationViewContext.tsx` stops swallowing per-file upload failures — any failure aborts before `messages.insert` and before invoking `send-reply-email`, so a partial-attachment reply can never go out.

### Guardrail audit (done)
- `pg_constraint` check on `event_category IN ('write','export','auth','system')` exists on `public.recruitment_audit_events`, **not** on any trigger fired from `messages`.
- Triggers on `public.messages` INSERT: `messages_maintain_preview`, `trigger_notify_customer_reply`, `trigger_notify_mentions`, `trigger_send_email_on_message_insert`, `trigger_send_note_edit_notification`, `trigger_set_first_response`, `trigger_slack_new_message`. None write to `recruitment_audit_events`. No event_category constraint risk on this path.

---

### Part 1 — Migration: add `image/avif` to `message-attachments`

Single statement, preserves all existing MIME types (incl. `image/webp` and `image/svg+xml`) and the 50 MiB `file_size_limit`:

```sql
UPDATE storage.buckets
SET allowed_mime_types = allowed_mime_types || ARRAY['image/avif']::text[]
WHERE id = 'message-attachments'
  AND NOT ('image/avif' = ANY(allowed_mime_types));
```

Idempotent. Other buckets untouched. `chat-attachments` bucket (used by `ChatReplyInput.tsx`) is not modified.

---

### Part 2 — Diff: `src/contexts/ConversationViewContext.tsx` (lines 300–334)

Only the upload loop inside `sendReplyMutation.mutationFn` changes. Everything outside this block (messages.insert, response_tracking, status update, send-reply-email invoke, onSuccess refetch/invalidate behavior) is untouched, so `refetchOnMount:'always'` and cross-invalidation of conversation/message query keys are preserved by construction.

```diff
   mutationFn: async ({ content, isInternal, status, files, replyAll }: { ... }) => {
     if (!conversationId) throw new Error('No conversation ID');

-    // Upload attachments to storage if any
-    let attachmentsMeta: any[] | null = null;
-    if (files && files.length > 0) {
-      const orgId = conversation?.organization_id;
-      if (!orgId) throw new Error('No organization ID for file upload');
-
-      attachmentsMeta = [];
-      for (const file of files) {
-        const uniqueName = `${crypto.randomUUID()}_${file.name}`;
-        const storagePath = `${orgId}/${conversationId}/${uniqueName}`;
-
-        const { error: uploadError } = await supabase.storage
-          .from('message-attachments')
-          .upload(storagePath, file);
-
-        if (uploadError) {
-          logger.warn('Failed to upload attachment', uploadError, 'ConversationViewProvider');
-          toast.error(`Failed to upload ${file.name}`);
-          continue;
-        }
-
-        attachmentsMeta.push({
-          filename: file.name,
-          mimeType: file.type || 'application/octet-stream',
-          size: file.size,
-          storageKey: storagePath,
-          isInline: false,
-        });
-      }
-      if (attachmentsMeta.length === 0) attachmentsMeta = null;
-    }
+    // Upload attachments to storage if any.
+    // ABORT on any failure — never send a reply that's missing its attachments.
+    let attachmentsMeta: any[] | null = null;
+    if (files && files.length > 0) {
+      const orgId = conversation?.organization_id;
+      if (!orgId) throw new Error('No organization ID for file upload');
+
+      const uploaded: { meta: any; storagePath: string }[] = [];
+      for (const file of files) {
+        const uniqueName = `${crypto.randomUUID()}_${file.name}`;
+        const storagePath = `${orgId}/${conversationId}/${uniqueName}`;
+
+        const { error: uploadError } = await supabase.storage
+          .from('message-attachments')
+          .upload(storagePath, file);
+
+        if (uploadError) {
+          logger.warn('Failed to upload attachment', uploadError, 'ConversationViewProvider');
+          // Best-effort rollback of any files already uploaded in this attempt
+          if (uploaded.length > 0) {
+            await supabase.storage
+              .from('message-attachments')
+              .remove(uploaded.map((u) => u.storagePath))
+              .catch(() => undefined);
+          }
+          // Throw → mutation rejects → no insert, no send-reply-email,
+          // composer content preserved (see onError below).
+          throw new Error(
+            `Couldn't upload ${file.name} — reply not sent, your text is kept`
+          );
+        }
+
+        uploaded.push({
+          storagePath,
+          meta: {
+            filename: file.name,
+            mimeType: file.type || 'application/octet-stream',
+            size: file.size,
+            storageKey: storagePath,
+            isInline: false,
+          },
+        });
+      }
+      attachmentsMeta = uploaded.length > 0 ? uploaded.map((u) => u.meta) : null;
+    }

     const { data: message, error: insertError } = await supabase
       .from('messages')
       .insert({ ... });
```

And add a paired `onError` to surface the message and keep the composer text (the existing `onSuccess` clears `replyText` — we must not clear on error):

```diff
   },
+  onError: (err: any) => {
+    toast.error(err?.message || 'Failed to send reply');
+    // Do NOT dispatch SET_REPLY_TEXT '' — composer content is preserved
+    // so the agent can retry without retyping.
+  },
   onSuccess: (newMessage) => {
     dispatch({ type: 'SET_REPLY_TEXT', payload: '' });
     ...
   },
```

Happy-path behavior (all uploads succeed) is byte-identical to today: same `attachmentsMeta` shape, same insert payload, same downstream invocation, same `onSuccess` cache writes and refetches.

`ChatReplyInput.tsx` and the `chat-attachments` bucket are not touched.

---

### Verification (run before declaring done)

1. **avif happy path.** Paste a screenshot (Chrome → `image/avif`) into the email reply composer on an open conversation. Expect: storage POST returns 200, attachment chip stays, message row inserts with `attachments[0].mimeType = 'image/avif'`, `send-reply-email` is invoked, recipient receives the file. Confirm via browser Network panel + `SELECT attachments FROM messages WHERE id = '<new id>'`.

2. **forced-failure abort path.** Temporarily attach a disallowed type (e.g. an `.exe` renamed to `image/x-msdownload`, or just a fresh `.heic` which is not in the allowlist) alongside text. Expect: toast `"Couldn't upload <name> — reply not sent, your text is kept"`; **no** new row in `messages` for that conversation in the last minute; **no** `send-reply-email` invocation in edge-function logs in that window; composer text still present. Confirm:
   ```sql
   SELECT id, content, created_at FROM messages
   WHERE conversation_id = '<test conv>' AND created_at > now() - interval '2 minutes';
   ```
   and `supabase--edge_function_logs send-reply-email` over the same window.

3. **Regression check on succeed-after-fail retry.** After (2), remove the bad file, keep the composer text, click Send. Expect normal send. Confirm one new row appears.

Not done until all three pass.