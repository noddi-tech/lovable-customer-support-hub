
# Interactive Chat Components System

## Problem
The AI chat currently renders everything as plain text. The user wants:
1. **Phone verification (data collection)** to be triggerable from the flow builder's data_collection node type, not just hardcoded keyword detection
2. **Action choices** rendered as clickable cards/pills instead of text lists
3. A **scalable system** so future interactive components can be added easily

## Solution: Structured Message Blocks

Instead of the AI returning only plain text, introduce a lightweight **block protocol** where the AI response can contain special markers that the widget parses into interactive UI components. The edge function instructs the AI to emit structured markers, and the widget's message renderer detects and renders them as components.

### How It Works

The AI includes special markers in its response text:

```
Here are your options:

[ACTION_MENU]
Book new service
View my bookings
Cancel a booking
Wheel storage
[/ACTION_MENU]
```

```
I need to verify your identity first.

[PHONE_VERIFY]
```

The widget parser splits the message content into segments: text blocks and component blocks. Each segment renders with the appropriate component.

### Block Types (extensible)

| Block Marker | Renders As | User Interaction |
|---|---|---|
| `[ACTION_MENU]...[/ACTION_MENU]` | Clickable pill/card buttons | Click sends the choice as a user message |
| `[PHONE_VERIFY]` | Phone input + OTP form | Inline verification flow (existing logic) |
| *(future)* `[DATE_PICKER]` | Calendar selector | Sends selected date |
| *(future)* `[CONFIRM]...[/CONFIRM]` | Confirmation card with Yes/No | Sends confirmation |

### Architecture

```text
AI Response (text with markers)
        |
   parseMessageBlocks(content)
        |
   Array<MessageBlock>
    /        |         \
TextBlock  ActionMenu  PhoneVerify
  (HTML)   (pills)     (form)
```

## Detailed Changes

### 1. Message Block Parser (new utility)

A `parseMessageBlocks` function that splits AI response content into typed blocks:

```typescript
type MessageBlock =
  | { type: 'text'; content: string }
  | { type: 'action_menu'; options: string[] }
  | { type: 'phone_verify' }

function parseMessageBlocks(content: string): MessageBlock[]
```

Scans for `[ACTION_MENU]...[/ACTION_MENU]` and `[PHONE_VERIFY]` markers. Everything outside markers becomes text blocks. This is simple string parsing -- no complex grammar needed.

### 2. AiChat.tsx -- Message Rendering

Replace the single `dangerouslySetInnerHTML` bubble with a block-based renderer:

- Each message's content is passed through `parseMessageBlocks`
- Text blocks render as before (DOMPurify + formatAiResponse)
- `action_menu` blocks render as a row of styled pill buttons. Clicking a pill calls `sendMessage(option)` automatically
- `phone_verify` blocks trigger the existing phone verification UI (move the current inline verification into a component, triggered by the block instead of keyword detection)

**Action Menu Pills**: Styled as rounded buttons with border, using the widget's `primaryColor`. Horizontal wrap layout. On click, the selected option is sent as a user message and the pills become disabled (showing which was selected).

**Phone Verify Block**: The existing phone/OTP form code extracted into a `PhoneVerifyBlock` component, rendered inline when the block is encountered. Replaces the keyword-detection trigger.

### 3. Edge Function -- Prompt Instructions

Update `buildNodePrompt` and the system prompt to instruct the AI to use markers:

- For `action_menu` nodes: tell the AI to wrap choices in `[ACTION_MENU]...[/ACTION_MENU]` markers
- For `data_collection` nodes with phone fields: tell the AI to include `[PHONE_VERIFY]` marker
- Add a section to the system prompt explaining available markers and when to use them

Example prompt addition:
```
INTERACTIVE COMPONENTS:
When presenting action choices, wrap them in markers:
[ACTION_MENU]
Option 1
Option 2
[/ACTION_MENU]

When phone verification is needed, include:
[PHONE_VERIFY]

The widget will render these as interactive UI elements.
Do NOT render these markers as plain text -- they are UI instructions.
```

### 4. Disable State for Used Components

Once a user clicks an action pill or completes verification, that block should become non-interactive (greyed out or show the selection). This prevents re-triggering old choices when scrolling through history.

Track "used" blocks by message ID + block index in component state.

## File Changes

| File | Change |
|------|--------|
| `src/widget/components/AiChat.tsx` | Add `parseMessageBlocks`, refactor message rendering to block-based, extract `PhoneVerifyBlock` and `ActionMenuBlock` inline components, remove keyword-detection trigger |
| `supabase/functions/widget-ai-chat/index.ts` | Update `buildNodePrompt` for action_menu/data_collection to instruct AI to use markers. Add marker documentation to system prompt. |

## Why This Approach

- **Scalable**: Adding a new component means adding a new block type to the parser and a renderer -- no changes to the AI infrastructure
- **Backward compatible**: Messages without markers render exactly as before
- **Simple**: String markers are trivial for LLMs to produce reliably, unlike JSON structures mid-stream
- **Works with streaming**: Markers can be detected as they stream in, rendering components once complete
