

# Translate All Widget Blocks to Norwegian

The following widget block components contain hardcoded English strings that need to be translated to Norwegian. The `BookingInfoBlock` and `BookingSelectBlock` are already fully Norwegian -- the remaining three booking blocks and error messages need updating.

## Files and Changes

### 1. `src/widget/components/blocks/BookingEditConfirmBlock.tsx`

| Line | English | Norwegian |
|------|---------|-----------|
| 94 | `Something went wrong, please try again later` | `Noe gikk galt, vennligst prøv igjen senere` |
| 115 | `Booking updated!` | `Bestilling oppdatert!` |
| 123 | `Edit cancelled` | `Endring avbrutt` |
| 134 | `Booking updated!` | `Bestilling oppdatert!` |
| 165 | `📍 Address` | `📍 Adresse` |
| 173 | `🕐 Time` | `🕐 Tid` |
| 179 | `📅 Date` | `📅 Dato` |
| 181 | `🚗 Car` | `🚗 Bil` |
| 182 | `🛠️ Service` | `🛠️ Tjeneste` |
| 187 | `Confirm changes to booking` | `Bekreft endringer for bestilling` |
| 191 | `Could not determine real booking ID. Please verify before confirming.` | `Kunne ikke finne riktig bestillings-ID. Vennligst bekreft før du fortsetter.` |
| 208 | `Review changes` | `Se gjennom endringer` |
| 228 | `Confirm Changes` | `Bekreft endringer` |
| 239 | `Cancel` | `Avbryt` |

### 2. `src/widget/components/blocks/BookingSummaryBlock.tsx`

| Line | English | Norwegian |
|------|---------|-----------|
| 91 | `Could not determine your selected time slot...` | `Kunne ikke finne valgt tidspunkt. Vennligst gå tilbake og velg et tidspunkt på nytt.` |
| 105 | `Booking is temporarily unavailable...` | `Bestilling er midlertidig utilgjengelig, vennligst prøv igjen senere` |
| 107 | `Failed to create booking` | `Kunne ikke opprette bestilling` |
| 125 | `Something went wrong, please try again later` | `Noe gikk galt, vennligst prøv igjen senere` |
| 146 | `Booking confirmed!` | `Bestilling bekreftet!` |
| 150 | `Booking #` | `Bestilling #` |
| 159 | `Booking cancelled` | `Bestilling avbrutt` |
| 170 | `Booking confirmed!` | `Bestilling bekreftet!` |
| 173 | `Booking #` | `Bestilling #` |
| 181 | `📍 Address` | `📍 Adresse` |
| 182 | `🚗 Car` | `🚗 Bil` |
| 183 | `🛠️ Service` | `🛠️ Tjeneste` |
| 184 | `📅 Date` | `📅 Dato` |
| 185 | `🕐 Time` | `🕐 Tid` |
| 186 | `💰 Price` | `💰 Pris` |
| 201 | `Review your booking details` | `Se gjennom bestillingsdetaljer` |
| 223 | `Confirm Booking` | `Bekreft bestilling` |
| 234 | `Cancel` | `Avbryt` |

### 3. `src/widget/components/blocks/BookingConfirmedBlock.tsx`

| Line | English | Norwegian |
|------|---------|-----------|
| 6 | `🛠️ Service` | `🛠️ Tjeneste` |
| 7 | `📍 Address` | `📍 Adresse` |
| 8 | `🚗 Car` | `🚗 Bil` |
| 9 | `📅 Date` | `📅 Dato` |
| 10 | `🕐 Time` | `🕐 Tid` |
| 11 | `💰 Price` | `💰 Pris` |
| 24 | `Booking confirmed!` | `Bestilling bekreftet!` |

### 4. "Wheel change" in screenshot

This comes from the Noddi API (`sales_items[].name`). The service name is returned by their backend, so we cannot control it -- it will display whatever language the Noddi API uses. No code change needed for this.

## Summary

Three files need translation: `BookingEditConfirmBlock.tsx`, `BookingSummaryBlock.tsx`, and `BookingConfirmedBlock.tsx`. All labels, buttons, success/error messages, and status texts will be changed from English to Norwegian, consistent with `BookingInfoBlock` and `BookingSelectBlock` which are already translated.
