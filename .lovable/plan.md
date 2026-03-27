

## Two-Part Fix: Hide CID-Miss Placeholders + Upload Gmail Attachment Binaries

### Problem

1. **CID-miss placeholders** show ugly gray boxes for signature images that have no binary data
2. **Root cause**: `gmail-sync` only stores attachment metadata (filename, attachmentId, contentId) but never downloads the actual binary from Gmail API or uploads it to Supabase Storage — so `storageKey` is always `null`

The SendGrid inbound pipeline correctly uploads binaries to storage and sets `storageKey`. Gmail-sync does not.

### Part 1: Hide Failed Inline Image Placeholders (Frontend)

**File: `src/utils/emailFormatting.ts`**

For CID-miss and data-missing cases where the image is inline (signature), instead of rendering a visible placeholder SVG, render a 1x1 transparent pixel with `style="display:none"`. This collapses the image to zero height.

Changes at 3 locations:
- **Line 318** (data-missing for CID): Replace placeholder with hidden 1x1 transparent GIF + `style="display:none"`
- **Line 328** (cid-miss): Same — hidden image instead of placeholder
- **Line 351** (data-missing for Content-Location): Same

Non-inline attachments (regular file attachments) keep their current placeholder behavior so users know something failed.

### Part 2: Download + Upload Gmail Attachment Binaries (Backend)

**File: `supabase/functions/gmail-sync/index.ts`**

After extracting attachment metadata (line ~511), add a step that:
1. Calls the Gmail API `users.messages.attachments.get` to download each attachment's binary data using `attachmentId`
2. Uploads the binary to Supabase Storage (`message-attachments` bucket) with the same path pattern as SendGrid: `{org_id}/{conversation_id}/{uuid}_{filename}`
3. Sets `storageKey` on the attachment object

This mirrors exactly what `sendgrid-inbound` does at lines 479-523. The Gmail access token is already available in the sync function.

### Summary

| # | File | Change |
|---|------|--------|
| 1 | `src/utils/emailFormatting.ts` | Hide placeholders for inline images (display:none instead of SVG) |
| 2 | `supabase/functions/gmail-sync/index.ts` | Download attachment binaries from Gmail API + upload to Supabase Storage |

After deploying part 2, a re-sync of existing conversations will fix historical CID-miss images. Part 1 provides an immediate visual fix.

