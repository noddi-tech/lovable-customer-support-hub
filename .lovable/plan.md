
# Replace Test Mode with Production Widget

## Problem

The Admin Test Mode currently uses a custom-built chat UI that does NOT match the production widget. It's missing:
- The phone verification form (phone input + OTP)
- The verified badge
- The escalation buttons
- The widget CSS styling
- The same message formatting (markdown, DOMPurify)

The user wants the test to be **identical** to what end-users see.

## Solution

Replace the custom chat implementation in `WidgetTestMode` with the actual `AiChat` component from the production widget (`src/widget/components/AiChat.tsx`), wrapped in the widget CSS styles. This ensures 1:1 parity with production.

The Session Log panel on the right stays -- it's useful for debugging. But the left side becomes the real widget UI.

## Changes

### File: `src/components/admin/widget/WidgetTestMode.tsx`

**Major rewrite** of the test mode component:

1. **Import the real widget components and CSS**:
   - Import `AiChat` from `@/widget/components/AiChat`
   - Import `@/widget/styles/widget.css` for widget styling

2. **Replace the custom chat UI** (the 360px mock chat window) with:
   - A container with `noddi-widget-container` and `noddi-widget-panel` classes (so widget CSS applies)
   - The actual `AiChat` component with the correct props:
     - `widgetKey`, `primaryColor`, `language` from config
     - `agentsOnline: false` (test mode, no live agents)
     - `enableChat: false`, `enableContactForm: false` (focus on AI testing)
     - `onTalkToHuman`, `onEmailConversation`, `onBack` as no-ops or log entries

3. **Remove the custom chat state**: Remove `messages`, `inputValue`, `isLoading`, `streamingContent`, `handleSendMessage`, and all the custom message rendering code. The `AiChat` component handles all of this internally.

4. **Keep the Session Log** panel and the start/stop controls. Remove the "Test phone" input from the toolbar since the real widget has its own phone verification UI.

5. **Revert the system prompt changes**: Since the test mode now uses the real widget (which HAS the phone form), the system prompt no longer needs special test-mode instructions. Revert `buildSystemPrompt` back to its two-mode form (verified/unverified), removing the `isTest` parameter entirely.

### File: `supabase/functions/widget-ai-chat/index.ts`

1. **Remove `isTest` parameter** from `buildSystemPrompt` -- no longer needed since test mode now uses the same UI as production.

2. **Revert to two-mode prompt**: Keep the verified and unverified verification contexts as they were, referencing "the phone verification form shown below" (which now actually exists in test mode too).

## What This Achieves

- Phone number input with +47 prefix -- identical to production
- 6-digit OTP input with auto-advance -- identical to production
- SMS verification flow -- identical to production
- Verified badge after successful verification
- AI responses with markdown formatting and DOMPurify
- Escalation buttons (if applicable)
- Same CSS styling as the deployed widget

## Technical Details

| File | Change |
|------|--------|
| `src/components/admin/widget/WidgetTestMode.tsx` | Replace custom chat with real `AiChat` component + widget CSS |
| `supabase/functions/widget-ai-chat/index.ts` | Remove `isTest` param from `buildSystemPrompt`, revert to verified/unverified only |
