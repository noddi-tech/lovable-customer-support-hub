

# Fix: PDF Attachment Download Not Working

## Root Cause
The attachment for "Møllr Bil Kalbakken.pdf" has `storageKey: null` in the database. This means the Gmail sync ingested the email metadata but failed to download and upload the attachment binary to Supabase Storage. The download button is intentionally disabled when `storageKey` is missing — but there's no user feedback explaining *why*.

## Two-Part Fix

### 1. Better UX when download is unavailable
Currently the button is just grayed out with no explanation. We should show a tooltip or message explaining the file isn't available and offer a re-sync option.

**File: `src/components/ui/email-render.tsx`** (AttachmentDownloadButton, ~line 155-170)
- When `!attachment.storageKey`, show the button as clickable but display a toast explaining "This attachment wasn't downloaded during sync. Try refreshing the conversation." instead of silently disabling it.

### 2. Fix this specific attachment by re-fetching from Gmail
The Gmail sync function already has attachment download logic. We need to either:
- **Option A**: Add a "Re-sync attachments" button/action that re-invokes the Gmail sync for this specific message to re-download missing attachments
- **Option B**: Create a small edge function that fetches a single attachment from Gmail on-demand when the user clicks download, and backfills the `storageKey`

**Recommended: Option B — On-demand attachment fetch**

**New file: `supabase/functions/fetch-gmail-attachment/index.ts`**
- Accepts `messageId` (our DB message ID) and attachment index/filename
- Looks up the message to find the Gmail message ID and the Gmail account
- Calls the Gmail API to fetch the specific attachment
- Uploads to Supabase Storage and updates the message's attachments JSON with the new `storageKey`
- Returns the file as a download

**File: `src/components/ui/email-render.tsx`** (AttachmentDownloadButton)
- When `!attachment.storageKey`, clicking download calls `fetch-gmail-attachment` instead
- On success, update the local attachment data and trigger the download
- Pass `messageId` prop through to `AttachmentDownloadButton`

### Technical Details

**Edge function logic:**
```
1. Receive { messageId, filename }
2. Query messages table for gmail_message_id and gmail account
3. Get Gmail access token (refresh if needed)
4. Call Gmail API: users.messages.attachments.get
5. Upload binary to storage bucket
6. Update messages.attachments JSONB to set storageKey
7. Return the file blob for immediate download
```

**EmailRender changes:**
- Pass `messageId` to `AttachmentDownloadButton`
- In `handleDownload`, if no `storageKey`, call `fetch-gmail-attachment` edge function
- On success, trigger download from the returned blob and show success toast

This ensures attachments that failed during initial sync can still be downloaded on-demand, and future downloads will be instant since the `storageKey` gets backfilled.

