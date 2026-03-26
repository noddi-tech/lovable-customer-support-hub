

## Fix: Email/Chat Width + Mobile Customer API Parity

### Problem 1: Excessive padding eating screen width

**Root cause chain** (confirmed via dev tools breadcrumb `div.p-4 > div.border.p-6.h-full`):

1. `EnhancedInteractionsLayout.tsx` line 334-335: `renderMessageThread()` wraps `ConversationView` in `<Card className="h-full"><CardContent className="p-6">` -- adds 1.5rem padding on all sides, plus card border/shadow
2. `MasterDetailShell.tsx` line 82: mobile detail mode wraps `detailLeft` in `<div className="p-4">` -- adds another 1rem padding

Combined = 2.5rem (40px) padding per side. On a 390px screen that's 80px wasted.

**Fix**: On mobile, skip the Card wrapper and remove shell padding.

| File | Line | Change |
|------|------|--------|
| `EnhancedInteractionsLayout.tsx` | 333-356 | Detect `isMobile` and render `<ConversationView>` directly without `<Card>/<CardContent>` wrapper |
| `MasterDetailShell.tsx` | 82 | Change `p-4` to `p-0` for the detail content wrapper on mobile |

### Problem 2: Mobile customer summary missing desktop features

The desktop `NoddihKundeData.tsx` shows rich info that `MobileCustomerSummaryCard.tsx` lacks:

- **Partner URLs**: "Open Customer" / "Open Booking #123" clickable links
- **Service tags**: Colored badges (Dekkhotell=blue, Dekkskift=green, Hjemlevering=purple, etc.)
- **Order summary**: Line items, quantities, VAT, total, outstanding amount
- **Paid state chip**: Paid (green) / Unpaid (red) / Partially paid (yellow)
- **Match mode**: "Matched by Email" / "Matched by Phone" badge
- **Unable to complete** status with strikethrough pricing

**Fix**: Add these to `MobileCustomerSummaryCard.tsx` using the same version-gating logic (`verNum >= 1.3`, etc.) and compact mobile layout.

### Files to modify

| File | Change |
|------|--------|
| `src/components/dashboard/EnhancedInteractionsLayout.tsx` | Mobile-only: skip Card/CardContent wrapper around ConversationView |
| `src/components/admin/design/components/layouts/MasterDetailShell.tsx` | Mobile detail: change `p-4` to `p-0` |
| `src/components/mobile/conversations/MobileCustomerSummaryCard.tsx` | Add partner URLs, service tags, order summary, paid state, match mode |

3 files. No new files. Desktop layout unchanged.

