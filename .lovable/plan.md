

## Compact Customer Information Panel -- 3 UI Improvements

Based on the screenshots and your existing `text-xs` / `h-7` density system, these three improvements will make the customer panel tighter, cleaner, and consistent with the rest of your toolbar/filter UI.

---

### Improvement 1: Shrink all text sizes to match toolbar density

The `NoddiCustomerDetails` component currently uses `text-base` for names, `text-sm` for details, and `text-lg` for card titles. Everything will be scaled down one notch to match the toolbar convention.

**File: `src/components/dashboard/voice/NoddiCustomerDetails.tsx`**

| Current | New |
|---------|-----|
| `CardTitle text-base` (header) | Remove Card wrapper entirely -- inline the header |
| Customer name `text-base font-semibold` | `text-xs font-semibold` |
| Email/phone `text-sm` | `text-xs` |
| Booking date/service/vehicle `text-sm` | `text-xs` |
| "Order Summary" heading `text-sm font-medium` | `text-xs font-medium` |
| Order line items `text-sm` | `text-xs` |
| VAT/Total rows `text-sm` | `text-xs` |
| Section labels like "Service Tags" | Already `text-xs` -- keep as-is |
| Icon sizes `h-4 w-4` | `h-3 w-3` throughout |

This single change brings the entire panel into the same visual weight as toolbar buttons and filters.

---

### Improvement 2: Remove Card nesting -- flat layout with tighter spacing

Currently the component renders inside a `<Card>` with `<CardHeader>` + `<CardContent className="space-y-4">`. Since it's already inside the `CustomerSidePanel` which has its own panel chrome, the nested Card adds unnecessary padding and borders.

**File: `src/components/dashboard/voice/NoddiCustomerDetails.tsx`**

- Replace outer `<Card>` / `<CardHeader>` / `<CardContent>` with a plain `<div className="space-y-2">` (tighter `space-y-2` instead of `space-y-4`)
- Move the "Customer Information" title + Refresh button into a compact single-line row: `text-xs font-semibold uppercase text-muted-foreground` (matching the "Status & Actions" label style in the side panel)
- Reduce booking card internal padding from `p-3` to `p-2`
- Reduce Order Summary card padding from `p-3` to `p-2`
- Remove excessive `mb-2` margins between badge rows, replace with `mb-1`

This eliminates the double-border visual clutter visible in the screenshots.

---

### Improvement 3: Inline badges on same line as name + single-line contact info

Currently the name, verified badge, personal/business badge, and "Default" badge wrap across 2-3 lines. Contact info (email, phone) takes separate lines with labels.

**File: `src/components/dashboard/voice/NoddiCustomerDetails.tsx`**

- Put name + badges in a single `flex items-center gap-1 flex-wrap` row with smaller badges (`h-4 px-1 text-[10px]`)
- Combine email + phone into a single compact line: `email@example.com | +47XXXXXXXX` using `text-xs text-muted-foreground` and a `·` separator, removing the "Customer Email (Primary):" label prefix
- Remove the "Noddi Account Email" line unless it differs from primary (already conditional, but also shrink)
- Remove the registration date line entirely (low-value info that clutters)

**Also in `src/components/dashboard/conversation-view/CustomerSidePanel.tsx`:**
- The panel header "Customer Details" already uses `text-sm` -- change to `text-xs font-semibold uppercase` matching the "Status & Actions" label
- Reduce padding from `p-4` to `p-3` in the scrollable content area

---

### Summary of files changed

| File | Changes |
|------|---------|
| `src/components/dashboard/voice/NoddiCustomerDetails.tsx` | Remove Card wrapper, text-xs everywhere, inline badges, compact contact info, tighter spacing |
| `src/components/dashboard/conversation-view/CustomerSidePanel.tsx` | Match header label style, reduce content padding |

