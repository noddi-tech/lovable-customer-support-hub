

## Fix: "To" Line Wrapping & Show Email Address for Agent Messages

### Problem 1: "To" wraps to second line
The `flex-wrap` class allows the "To:" label and the badge to break onto separate lines on narrow cards. Since this row is simple (label + 1-2 badges), we should use `flex-nowrap` with `overflow-hidden` and `text-ellipsis` on the badges instead.

### Problem 2: Shows "Dekkfix" instead of customer email
The `display()` helper prefers `addr.name` over `addr.email`. For this message, the email header was `To: Dekkfix <hei@dekkfix.no>` — so "Dekkfix" is correct per the stored data. But it's misleading.

**Fix**: Change the `display()` function or the badge rendering to **show the email address** when the name matches the organization/inbox name, or simpler: always show email in a tooltip, and for agent-sent messages, prefer showing the email address (since agents care about *who* it was sent to).

### Problem 3: Reply was sent to wrong address
The agent reply on March 19 was sent **before** the fix was deployed, so it went to `hei@dekkfix.no` (the inbox). This cannot be undone. Future replies to this conversation will correctly go to `amanueltekber@gmail.com` thanks to the Reply-To fallback we added.

### Changes

**File: `src/components/conversations/MessageCard.tsx`**

1. **Fix wrapping**: Change `flex-wrap` to `flex-nowrap` on the recipients row, add `min-w-0` for truncation
2. **Show email for agent messages**: In the recipients section, for agent-sent messages, prefer showing `addr.email` over `addr.name` — agents need to verify the actual recipient address
3. **Add tooltip**: Wrap each badge with a title/tooltip showing the full email address for all messages

| File | Change |
|------|--------|
| `MessageCard.tsx` | Fix flex-wrap → flex-nowrap on "To" row; show email instead of name for agent messages |

