

# Dynamic Phone Country Code from Widget Configuration

## Overview

Replace the hardcoded `+47` (Norway) phone prefix with a dynamic one derived from the widget's `language` setting, which is already available as a prop in `PhoneVerifyBlock`.

## Approach

Create a simple language-to-phone-prefix mapping and use it throughout the phone verification block.

## Changes

### 1. Add country code mapping utility

**New file: `src/widget/utils/phoneCountryCodes.ts`**

A small lookup mapping language codes (already configured per widget) to phone country info:

```
no -> { prefix: '+47', placeholder: 'XXX XX XXX', flag: '🇳🇴' }
en -> { prefix: '+44', placeholder: 'XXXX XXXXXX', flag: '🇬🇧' }
sv -> { prefix: '+46', placeholder: 'XX XXX XX XX', flag: '🇸🇪' }
da -> { prefix: '+45', placeholder: 'XX XX XX XX', flag: '🇩🇰' }
de -> { prefix: '+49', placeholder: 'XXX XXXXXXX', flag: '🇩🇪' }
fr -> { prefix: '+33', placeholder: 'X XX XX XX XX', flag: '🇫🇷' }
es -> { prefix: '+34', placeholder: 'XXX XXX XXX', flag: '🇪🇸' }
it -> { prefix: '+39', placeholder: 'XXX XXX XXXX', flag: '🇮🇹' }
pt -> { prefix: '+351', placeholder: 'XXX XXX XXX', flag: '🇵🇹' }
nl -> { prefix: '+31', placeholder: 'X XXXXXXXX', flag: '🇳🇱' }
```

Default fallback: `+47` (Norway) for unknown languages.

### 2. Update `PhoneVerifyBlock.tsx`

- Import the mapping utility
- Use `language` prop (already available) to resolve the prefix
- Replace all three hardcoded `+47` references:
  - **Line 75**: `phone = prefix + phone` (when storing to localStorage)
  - **Line 115**: `<span className="noddi-phone-prefix">{prefix}</span>` (UI label)
  - **Line 116**: Dynamic placeholder based on language

### 3. Update `PhoneVerifyPreview` (same file)

- Replace the static `+47` in the admin preview (line 220) with a generic display or keep as-is since it's just a preview thumbnail.

### 4. Update edge function phone normalization

**File: `supabase/functions/widget-ai-chat/index.ts`**

The `patchBookingSummary` function also has `+47` hardcoded when normalizing the visitor phone. Update it to detect the country code from the phone number format rather than assuming Norwegian.

## No database changes required

The `language` field already exists on `widget_configs` and is already returned by the `widget-config` edge function and passed through to block components.
