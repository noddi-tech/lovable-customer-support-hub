

# Fix: AI Chatbot Hardcoded URLs and UX Improvements

## What's Already Working
The `OPENAI_API_KEY` is configured and available. The AI chatbot edge function (`widget-ai-chat`) should be functional for chat completions and knowledge search embeddings.

## Bugs to Fix

### 1. Hardcoded API URL in AiFeedback.tsx
The feedback component uses a hardcoded Supabase URL instead of the dynamic `getApiUrl()` helper. If the API URL changes, feedback submissions would break silently.

**Fix**: Replace the hardcoded string with `getApiUrl()` from `../api`.

### 2. Hardcoded API URL in WidgetTestMode.tsx
Same issue in the admin test mode component -- hardcoded URL instead of using environment variables.

**Fix**: Use `import.meta.env.VITE_SUPABASE_URL` instead of the hardcoded string.

## UX Improvement

### 3. Add "New Conversation" button in AI Chat
Currently users cannot start a fresh AI conversation without waiting 24 hours or clearing browser storage. A small reset button in the chat header will let users start over.

## Changes Summary

| File | Change |
|------|--------|
| `src/widget/components/AiFeedback.tsx` | Replace hardcoded URL with `getApiUrl()` |
| `src/components/admin/widget/WidgetTestMode.tsx` | Replace hardcoded URL with env variable |
| `src/widget/components/AiChat.tsx` | Add "New Conversation" button to clear session and start fresh |

