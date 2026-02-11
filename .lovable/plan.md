
# Comprehensive Interactive Component System for AI Chat Widget

## Problem

The current system has two major gaps:

1. **Flow Builder UX is opaque**: When an admin adds a "Data Collection" node with a phone field, there's no visual indication that this will trigger a phone+PIN verification component in the widget. The field type dropdown (`phone`, `email`, `text`, etc.) doesn't communicate what interactive UI the customer will see. The admin has to guess.

2. **Widget component library is minimal**: Only two interactive blocks exist (`[ACTION_MENU]` and `[PHONE_VERIFY]`). There's no `[YES_NO]` for decisions, no `[EMAIL_INPUT]`, no `[RATING]`, no `[CONFIRM]`. The system needs to be scalable so new components can be added without rewriting the architecture.

## Solution Overview

### Part 1: Expand the Block Protocol (new marker types)

Add these new interactive block types to the marker system:

| Marker | Widget Renders | Use Case |
|---|---|---|
| `[YES_NO]question text[/YES_NO]` | Two buttons: thumbs-up YES / thumbs-down NO | Decision nodes |
| `[EMAIL_INPUT]` | Styled email input with validation | Data collection (email) |
| `[TEXT_INPUT]placeholder[/TEXT_INPUT]` | Styled text input | Data collection (text) |
| `[RATING]` | 5-star or emoji rating row | Feedback collection |
| `[CONFIRM]summary text[/CONFIRM]` | Confirmation card with Accept/Decline buttons | Before destructive actions |

### Part 2: Enrich Flow Builder Node Cards with Visual Previews

The Node Cards on the flow canvas should visually preview what the customer will see:

- **Data Collection (phone)**: Show a mini phone input + PIN icon preview on the card, with a badge "Phone Verify Component"
- **Data Collection (email)**: Show a mini email input preview with envelope icon
- **Decision nodes**: Show mini YES/NO buttons (thumb up/down icons) on the card
- **Action Menu**: Already shows pill previews (keep as-is)
- **Escalation**: Show a "handoff to agent" badge

The Node Editor sidebar should also show a "Customer sees:" preview section that renders a miniature version of the interactive component.

### Part 3: Upgrade Node Editor with Component-Aware Configuration

When the admin selects a `data_collection` node with a `phone` field type, the editor should show:
- An info banner: "This will render a phone verification form with SMS PIN code in the chat"
- A visual preview of the PhoneVerifyBlock component
- Configuration options specific to phone verification (e.g., country code prefix)

For `decision` nodes:
- An info banner: "The customer will see YES/NO buttons with thumbs up/down icons"
- Visual preview of the YES_NO buttons

### Part 4: Update Edge Function Prompt Generation

Update `buildNodePrompt` and `buildPreVerificationFlowPrompt` to emit the new markers:
- Decision nodes: instruct AI to use `[YES_NO]question[/YES_NO]`
- Data collection (email): instruct AI to use `[EMAIL_INPUT]`
- Data collection (text): instruct AI to use `[TEXT_INPUT]placeholder[/TEXT_INPUT]`

Update the system prompt's INTERACTIVE COMPONENTS section to document all available markers.

## Detailed File Changes

### File 1: `src/widget/utils/parseMessageBlocks.ts`

Extend `MessageBlock` type and parser to handle new markers:

```typescript
export type MessageBlock =
  | { type: 'text'; content: string }
  | { type: 'action_menu'; options: string[] }
  | { type: 'phone_verify' }
  | { type: 'yes_no'; question: string }
  | { type: 'email_input' }
  | { type: 'text_input'; placeholder: string }
  | { type: 'rating' }
  | { type: 'confirm'; summary: string };
```

Add detection for `[YES_NO]...[/YES_NO]`, `[EMAIL_INPUT]`, `[TEXT_INPUT]...[/TEXT_INPUT]`, `[RATING]`, `[CONFIRM]...[/CONFIRM]` in the parser loop.

### File 2: `src/widget/components/AiChat.tsx`

Add new inline block components:

- **YesNoBlock**: Two large buttons side by side. YES button with thumbs-up icon (green tint), NO button with thumbs-down icon (red tint). On click, sends "Yes" or "No" as user message and disables both buttons, highlighting the chosen one.

- **EmailInputBlock**: Styled email input field with envelope icon and submit button. Validates email format before sending. On submit, sends email as user message and shows confirmed state.

- **TextInputBlock**: Generic text input with the provided placeholder. Submit button sends text as user message.

- **RatingBlock**: Row of 5 star (or smiley) buttons. Clicking sends "Rating: X/5" as user message. Locked after selection.

- **ConfirmBlock**: Card showing summary text with two buttons: "Confirm" (green, check icon) and "Cancel" (red, X icon). Sends the choice as user message.

Update `MessageBlockRenderer` to route new block types to their components.

### File 3: `src/components/admin/widget/AiFlowBuilder.tsx`

**NodeCard preview enhancements** (lines ~648-660):

For `data_collection` nodes, show component-specific badges:
- Phone field: purple badge with phone icon + "Phone + PIN Verification"
- Email field: purple badge with mail icon + "Email Input"
- Text field: purple badge with text icon + "Text Input"
- Date field: purple badge with calendar icon + "Date Picker"

For `decision` nodes (lines ~655-658):
- Replace the plain text "IF: ..." preview with mini YES/NO button pills (thumb up/down icons)

**NodeEditor component preview section** (after the field configuration, ~line 1035-1067):

Add a "Customer Preview" section inside the editor that shows a visual approximation of what the customer will see in the chat for each component type:
- Phone: miniature phone input mockup with "+47" prefix and PIN dots
- Email: miniature email input mockup
- Decision: YES/NO button preview with thumbs icons
- Action Menu: already has pill preview
- Escalation: "Agent handoff" visual

Add info banners per field type explaining the component behavior:
- Phone: "The customer will see a phone number input. After entering their number, they'll receive an SMS with a 6-digit PIN code to verify their identity."
- Email: "The customer will see an email input field with validation."
- Decision YES/NO: "The customer will see two buttons with thumbs up (YES) and thumbs down (NO) icons."

### File 4: `supabase/functions/widget-ai-chat/index.ts`

**Update `buildNodePrompt`**:
- For `decision` nodes: add instruction to emit `[YES_NO]question text[/YES_NO]` where the question is derived from the condition's `check` field
- For `data_collection` with email fields: instruct AI to emit `[EMAIL_INPUT]`
- For `data_collection` with text fields: instruct AI to emit `[TEXT_INPUT]placeholder[/TEXT_INPUT]`

**Update system prompt INTERACTIVE COMPONENTS section** (~line 634-645):
Add documentation for all new markers so the AI knows when and how to use them.

**Update `buildPreVerificationFlowPrompt`**:
Add handling for decision nodes to emit `[YES_NO]` instructions in the pre-verification phase.

## Summary of Files

| File | Change |
|---|---|
| `src/widget/utils/parseMessageBlocks.ts` | Add 5 new block types to the type and parser |
| `src/widget/components/AiChat.tsx` | Add YesNoBlock, EmailInputBlock, TextInputBlock, RatingBlock, ConfirmBlock components; update MessageBlockRenderer |
| `src/components/admin/widget/AiFlowBuilder.tsx` | Add component-specific badges on NodeCard, add "Customer Preview" section in NodeEditor with info banners per field type |
| `supabase/functions/widget-ai-chat/index.ts` | Update buildNodePrompt, buildPreVerificationFlowPrompt, and system prompt for new markers |
