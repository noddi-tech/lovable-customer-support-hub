

# Phone Verification (SMS OTP) and Smart Order Flow for AI Chat

## Overview

Add a two-factor phone verification step to the AI chat widget. When a customer enters their phone number, we send an SMS PIN via Noddi's `/v1/users/send-phone-number-verification-v2/` endpoint. The customer must enter the PIN to verify their identity before the AI can access their account data (bookings, wheel storage, etc.). Once verified, the AI proactively checks the customer's situation and guides them accordingly.

## Verification Flow

```text
+-------------------+     +-------------------+     +-------------------+
| Enter phone       | --> | SMS PIN sent      | --> | Enter PIN code    |
| number            |     | via Noddi API     |     | to verify         |
+-------------------+     +-------------------+     +-------------------+
                                                            |
                                                     +------+------+
                                                     |  Verified!  |
                                                     +------+------+
                                                            |
                                              +-------------+-------------+
                                              |                           |
                                     Has upcoming order?          No upcoming order
                                              |                           |
                                     "Want to change            "Want to create a
                                      anything?"                 new order?"
                                              |                           |
                                     Has wheel storage?         Has previous orders?
                                              |                           |
                                     "Manage your               "Create similar
                                      dekkhotell?"               order?"
```

## Changes Required

### 1. New Edge Function: `widget-send-verification`

A new edge function that acts as a proxy to Noddi's SMS verification API.

**File**: `supabase/functions/widget-send-verification/index.ts`

- Accepts `POST` with `{ widgetKey, phoneNumber }`
- Validates the widget key is active
- Calls `POST ${NODDI_API_BASE}/v1/users/send-phone-number-verification-v2/` with the phone number
- Returns success/failure to the widget
- Rate-limited: max 3 SMS per phone number per 10 minutes

Note: We need to clarify what this Noddi endpoint returns. The implementation will pass the phone number and relay the response. If the endpoint returns a verification token/ID, we store it temporarily to validate against later. If verification happens entirely on the Noddi side, we just need to know the confirmation endpoint.

### 2. New Edge Function: `widget-verify-phone`

Handles PIN verification.

**File**: `supabase/functions/widget-verify-phone/index.ts`

- Accepts `POST` with `{ widgetKey, phoneNumber, pin }`
- Validates the PIN against Noddi's verification system (or against a stored code if we generate it ourselves)
- On success, returns `{ verified: true }` and stores the verified phone in the conversation
- On failure, returns `{ verified: false, attemptsRemaining }` (max 5 attempts)

### 3. Update Widget UI: `AiChat.tsx`

Replace the current simple phone input with a two-step verification flow:

**Current behavior**: Phone number is optional, can be skipped, and is just stored locally.

**New behavior**:
1. Phone input step: Customer enters phone number, clicks "Send code"
2. PIN input step: Shows 4-6 digit PIN input field (using OTP-style input)
3. Verified state: Shows a green checkmark next to the phone number, unlocks full account access
4. Unverified state: AI can still answer general questions but cannot look up/modify bookings

**State additions**:
- `verificationStep: 'phone' | 'pin' | 'verified'`
- `verificationError: string | null`
- `pinValue: string`

### 4. Update Edge Function: `widget-ai-chat/index.ts`

**System prompt changes**: Add instructions for the AI to behave differently based on verification status.

**New request field**: `isVerified: boolean` -- passed from the widget to indicate the customer's phone is verified.

**New tool**: `get_customer_overview` -- a new tool that combines customer lookup + upcoming bookings + wheel storage status + previous orders into one call. The AI calls this automatically after verification.

**Updated system prompt logic**:
- If verified: "The customer's phone number has been verified via SMS. You can freely access their account data. After lookup, proactively check: (1) upcoming orders -- ask if they want to change anything, (2) wheel storage/dekkhotell -- ask if they want to manage it, (3) previous orders -- suggest creating a similar order."
- If not verified: "The customer has not verified their phone. You can answer general questions only. If they ask about bookings, prompt them to verify their phone first."

### 5. Translation Updates

Add new keys to all 10 language files:

| Key | English | Norwegian |
|-----|---------|-----------|
| `verifyPhone` | "Verify your phone number" | "Verifiser telefonnummeret ditt" |
| `sendCode` | "Send code" | "Send kode" |
| `enterPin` | "Enter the code sent to your phone" | "Skriv inn koden sendt til telefonen din" |
| `verifyBtn` | "Verify" | "Verifiser" |
| `phoneVerified` | "Phone verified" | "Telefon verifisert" |
| `invalidPin` | "Invalid code, please try again" | "Ugyldig kode, vennligst prøv igjen" |
| `codeSent` | "Code sent!" | "Kode sendt!" |
| `resendCode` | "Resend code" | "Send kode på nytt" |

### 6. Widget CSS Updates

Add styles for:
- PIN input field (OTP-style boxes)
- Verification success indicator (green checkmark)
- "Resend code" link
- Loading state for SMS sending

### 7. API Module Updates: `src/widget/api.ts`

Add two new functions:
- `sendPhoneVerification(widgetKey, phoneNumber)` -- calls the new edge function
- `verifyPhonePin(widgetKey, phoneNumber, pin)` -- calls the verification endpoint

### 8. Database Schema Update

Add a `phone_verified` boolean column to `widget_ai_conversations`:

```sql
ALTER TABLE widget_ai_conversations 
ADD COLUMN phone_verified boolean DEFAULT false;
```

This tracks whether the visitor's phone was verified in each conversation, useful for analytics and security auditing.

## Technical Details

### Security Considerations
- SMS rate limiting: max 3 per phone per 10 minutes (prevents abuse)
- PIN attempt limiting: max 5 attempts per verification session
- Verified status is stored server-side in the conversation record, not just client-side
- The `widget-ai-chat` function validates verification status before allowing account operations

### Files to Create
| File | Purpose |
|------|---------|
| `supabase/functions/widget-send-verification/index.ts` | SMS sending proxy |
| `supabase/functions/widget-verify-phone/index.ts` | PIN verification |

### Files to Modify
| File | Changes |
|------|---------|
| `supabase/functions/widget-ai-chat/index.ts` | Add `isVerified` flag, new tool, updated system prompt |
| `src/widget/components/AiChat.tsx` | Replace phone input with verification flow |
| `src/widget/api.ts` | Add `sendPhoneVerification` and `verifyPhonePin` functions |
| `src/widget/styles/widget.css` | Verification UI styles |
| `src/widget/translations/en.json` | New translation keys |
| `src/widget/translations/no.json` | New translation keys |
| `src/widget/translations/es.json` | New translation keys |
| `src/widget/translations/fr.json` | New translation keys |
| `src/widget/translations/de.json` | New translation keys |
| `src/widget/translations/it.json` | New translation keys |
| `src/widget/translations/pt.json` | New translation keys |
| `src/widget/translations/nl.json` | New translation keys |
| `src/widget/translations/sv.json` | New translation keys |
| `src/widget/translations/da.json` | New translation keys |

### Database Migration
- Add `phone_verified` column to `widget_ai_conversations`

