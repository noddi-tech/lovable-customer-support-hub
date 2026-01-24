
## Fix Inconsistent Customer Name Formatting

### Problem Summary
Two messages from the same customer display differently because:
1. One message has proper email headers with `From: "Ole Kr. Ranvik" <email>`
2. The other message has no headers and falls back to customer record where `full_name` equals the email address

This creates ugly formatting like `ole.kr.ranvik@gmail.com <ole.kr.ranvik@gmail.com>`.

### Solution: Smart Label Formatting in normalizeMessage.ts

**File:** `src/lib/normalizeMessage.ts`

#### Change 1: Detect when name equals email and avoid duplication (lines 356-368)

```typescript
// Before building authorLabel, check if name is just the email
const isNameJustEmail = (name: string | undefined, email: string | undefined) => {
  if (!name || !email) return false;
  return name.toLowerCase().trim() === email.toLowerCase().trim() ||
         name.toLowerCase().includes(email.toLowerCase());
};

// Use conversation fallbacks only if still missing
if (!authorLabel) {
  if (authorType === 'customer' && ctx.conversationCustomerEmail) {
    const e = ctx.conversationCustomerEmail.toLowerCase();
    const n = ctx.conversationCustomerName;
    fromEmail = fromEmail ?? e;
    fromName = fromName ?? n;
    
    // Don't show "email <email>" pattern - just show email once
    if (isNameJustEmail(n, e)) {
      authorLabel = e; // Just the email, no redundancy
    } else {
      authorLabel = (n && e) ? `${n} <${e}>` : (e || n);
    }
  } else if (authorType === 'agent') {
    fromEmail = fromEmail ?? ctx.inboxEmail?.toLowerCase() ?? ctx.currentUserEmail?.toLowerCase();
    authorLabel = fromEmail || 'Agent';
  }
}
```

#### Change 2: Also apply this logic when building authorLabel earlier (line 343-345)

```typescript
// Build display label (public) - avoid email duplication
if (isNameJustEmail(cleanFromName, cleanFromEmail)) {
  authorLabel = cleanFromEmail || cleanFromName || undefined;
} else {
  authorLabel =
    (cleanFromName && cleanFromEmail) ? `${cleanFromName} <${cleanFromEmail}>`
    : (cleanFromEmail || cleanFromName || undefined);
}
```

### Bonus: Update Customer Record When Better Name Available

When a message arrives with a proper name in the `From:` header, we should update the customer record so future messages also benefit.

**This is already happening via Noddi sync** according to memory context, but we can ensure the fallback display is always clean.

### Expected Behavior After Fix

| Scenario | Before | After |
|----------|--------|-------|
| Headers with proper name | `"Ole Kr. Ranvik"` | `"Ole Kr. Ranvik"` (unchanged) |
| No headers, customer.full_name = email | `ole.kr.ranvik@gmail.com <ole.kr.ranvik@gmail.com>` | `ole.kr.ranvik@gmail.com` |
| No headers, customer has real name | `Ole Ranvik <ole@email.com>` | `Ole Ranvik <ole@email.com>` (unchanged) |

### Files to Modify
1. **`src/lib/normalizeMessage.ts`** - Add deduplication logic for author labels

### Optional: Backfill Customer Names
Run a one-time data migration to update customers where `full_name = email`:
```sql
-- Find customers with email as name
SELECT id, full_name, email 
FROM customers 
WHERE lower(full_name) = lower(email);

-- Could extract names from message headers for these customers
```

This is optional since the display fix will handle it gracefully.
