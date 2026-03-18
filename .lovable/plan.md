

## Plan: Add Reply All Support

### Current State
- `send-reply-email` sends only to the customer (`to: [{ email: toEmail }]`) — no CC recipients
- Inbound emails store raw headers in `email_headers` (SendGrid stores `{ raw: headersRaw }`, email-webhook stores `{ from, to, inReplyTo, references }`)
- CC information exists in the raw headers of inbound emails but is never extracted or used

### Approach
Extract CC recipients from the conversation's inbound messages and include them in outgoing replies via SendGrid's `cc` field.

### Changes

**`supabase/functions/send-reply-email/index.ts`**:

1. **Extract CC recipients from previous messages**: Query the conversation's messages for `email_headers`, parse the `Cc` header from raw headers (SendGrid format) or structured headers
2. **Build CC list**: Collect all unique CC email addresses, excluding:
   - The customer's email (already in `to`)
   - The sending address (`fromEmailFinal`) to avoid sending to self
3. **Add CC to SendGrid payload**: Add a `cc` field to the `personalizations` array with the collected addresses
4. **Store CC in outgoing email headers**: Include CC in the `emailHeaders` object saved to the message record

**Helper function** to parse CC from various header formats:
```typescript
function extractCcRecipients(messages: any[], excludeEmails: string[]): { email: string; name?: string }[] {
  const seen = new Set(excludeEmails.map(e => e.toLowerCase()));
  const ccList: { email: string; name?: string }[] = [];
  
  for (const msg of messages) {
    const headers = msg.email_headers;
    if (!headers) continue;
    
    let ccRaw = '';
    if (headers.raw) {
      // SendGrid inbound format - parse from raw headers
      ccRaw = parseHeaderValue(headers.raw, 'Cc') || parseHeaderValue(headers.raw, 'CC') || '';
    } else if (headers.cc) {
      ccRaw = headers.cc;
    }
    
    // Parse "Name <email>" or bare emails from comma-separated list
    for (const part of ccRaw.split(',')) {
      const email = extractEmail(part.trim());
      if (email && !seen.has(email.toLowerCase())) {
        seen.add(email.toLowerCase());
        ccList.push({ email });
      }
    }
  }
  return ccList;
}
```

**In the SendGrid payload** (around line 339):
```typescript
const ccRecipients = extractCcRecipients(previousMessages, [toEmail, fromEmailFinal]);

personalizations: [{
  to: [{ email: toEmail, name: customer.full_name || undefined }],
  ...(ccRecipients.length > 0 ? { cc: ccRecipients } : {}),
}],
```

### File changed

| File | Change |
|---|---|
| `supabase/functions/send-reply-email/index.ts` | Add CC extraction from conversation history, include in SendGrid payload |

