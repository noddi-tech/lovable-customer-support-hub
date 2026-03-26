

## Fix Mobile Email: Customer API Data, Signature Images, Full Width

### 3 Issues to Fix

**1. Customer API (Noddi) data not showing**
`MobileCustomerSummaryCard` reads `noddiData?.data?.bookings` -- this field does not exist in the `NoddiLookupResponse` type. The actual data structure uses:
- `noddiData.data.ui_meta.display_name` for name
- `noddiData.data.ui_meta.service_title` for service
- `noddiData.data.ui_meta.booking_date_iso` for date
- `noddiData.data.ui_meta.vehicle_label` for vehicle
- `noddiData.data.ui_meta.status_label` for status
- `noddiData.data.ui_meta.money` for payment info
- `noddiData.data.all_user_groups` for booking groups
- `noddiData.data.priority_booking` for the main booking
- `noddiData.data.unpaid_count` for unpaid alerts

**2. Signature images too large**
The CSS already has `max-width: 100%` on images in `.mobile-email-body`, but signature images are not inside an `.email-signature` class -- they're just regular `<img>` tags in the email HTML. Need to add a max-height constraint on all images inside mobile email body (e.g., `max-height: 120px` for images that are smaller than full-width).

**3. Content not using full card width**
`MobileEmailMessageCard` uses `px-3` padding on the body. The parent `MobileEmailConversationView` also has no extra padding. The issue from the screenshot shows the desktop `ConversationViewContent` is still rendering its own wrapper with padding around the mobile component. Need to check the outer container.

### Changes

#### File 1: `src/components/mobile/conversations/MobileCustomerSummaryCard.tsx`
Rewrite to use the actual `NoddiLookupResponse` data structure:
- Import the `NoddiLookupResponse` type
- Read from `noddiData.data.ui_meta` for display name, service title, vehicle, status, booking date, money/payment
- Show `all_user_groups` with booking counts
- Show unpaid alert when `unpaid_count > 0`
- Default expanded when Noddi data is found
- Show phone from `noddiData.data.user?.phone_number`

#### File 2: `src/components/mobile/conversations/MobileEmailMessageCard.tsx`
- Reduce body padding from `px-3` to `px-2` to use more width

#### File 3: `src/index.css`
Add to the mobile-email-body media query:
```css
/* Constrain signature-like images (logos, headshots) */
.mobile-email-body .email-render__html-content img[width],
.mobile-email-body .email-render__html-content img {
  max-height: 80px;
  object-fit: contain;
}
/* But allow full-width content images */
.mobile-email-body .email-render__html-content img[style*="width: 100%"],
.mobile-email-body .email-render__html-content img.content-image {
  max-height: none;
}
```

### Summary
| File | Change |
|------|--------|
| `MobileCustomerSummaryCard.tsx` | Rewrite to use actual NoddiLookupResponse fields (ui_meta, all_user_groups, etc.) |
| `MobileEmailMessageCard.tsx` | Reduce padding to `px-2` |
| `src/index.css` | Add `max-height: 80px` on email images to shrink signature logos |

3 files. No new dependencies. Desktop unchanged.

