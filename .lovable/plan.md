

## Fix: Norwegian Characters (øæå) Broken in Synced-Back Sent Emails

### Problem
When an agent sends a reply containing Norwegian characters (å, ø, æ), the email is sent correctly via SendGrid, but when Gmail syncs it back into the conversation, those characters appear as `�` (replacement characters). The internal view of the same message renders fine — only the synced-back copy is broken.

### Root Cause
Two issues working together:

1. **`send-reply-email/index.ts`** — SendGrid content type doesn't explicitly specify charset, so the delivered email's MIME header may not declare `charset=utf-8`. Gmail may then store/return the email with a different charset label (e.g., `us-ascii`).

2. **`gmail-sync/index.ts`** — The decoder trusts the charset from the Content-Type header blindly. If it says `us-ascii`, multi-byte UTF-8 characters (å, ø, æ) produce `�` replacement characters. The client-side `emailDecoder.ts` has Norwegian encoding fixes, but the edge function decoder doesn't.

### Fix

**File 1: `supabase/functions/gmail-sync/index.ts`**

Update the `getDecodedEmailContent` function to:
- After decoding, check if the result contains `�` (U+FFFD replacement character) AND the charset wasn't UTF-8
- If so, retry decoding the same bytes as UTF-8
- Also add the `fixNorwegianEncoding` function (from `emailDecoder.ts`) as a final fallback for `Ã¸`/`Ã¥`/`Ã¦` patterns

**File 2: `supabase/functions/send-reply-email/index.ts`**

Explicitly set charset in the SendGrid content type to prevent the issue at the source:
```
{ type: 'text/plain; charset=utf-8', value: plainText }
{ type: 'text/html; charset=utf-8', value: emailHTML }
```

### Files Changed
| File | Change |
|------|--------|
| `gmail-sync/index.ts` | Add UTF-8 retry when `�` detected, add Norwegian encoding fixes |
| `send-reply-email/index.ts` | Add `charset=utf-8` to SendGrid content types |

Both edge functions will auto-deploy.

