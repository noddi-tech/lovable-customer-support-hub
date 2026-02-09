

# Phase 1: Read-Only AI Chatbot for the Widget

## Summary

Replace the current "Search Answers" (FAQ accordion) view with an AI-powered conversational assistant that uses your knowledge base to answer questions and can look up customer bookings via the Noddi API. Read-only for now -- no booking modifications.

When the AI can't answer, the customer can either **talk to a human** (if agents are online) or **email the conversation transcript** (if offline).

## What Changes

### 1. New Edge Function: `widget-ai-chat`

A single new edge function that:
- Receives customer messages + conversation history
- Uses OpenAI tool-calling with these read-only tools:

| Tool | What it does |
|------|-------------|
| `search_knowledge_base` | Embeds the query, calls `find_similar_responses` RPC, returns top matches |
| `lookup_customer` | Calls `noddi-customer-lookup` internally -- phone first, email fallback |
| `get_booking_details` | Calls Noddi API `GET /v1/bookings/{id}/` for a specific booking |

- System prompt enforces Noddi tone of voice, Norwegian/English language matching, and never inventing data
- Customer identification: asks for phone number first (primary identifier), falls back to email
- Returns structured responses: `{ reply: string, sources?: [...], bookingCard?: {...} }`
- Handles streaming via SSE for real-time token delivery

### 2. Widget UI Changes

**WidgetView type**: Add `'ai'` to the union: `'home' | 'contact' | 'search' | 'chat' | 'ai'`

**WidgetPanel.tsx**: 
- Replace the "Search our help center" button with "AI Assistant" as the primary action
- When clicked, opens the new `AiChat` component instead of `KnowledgeSearch`

**New component: `AiChat.tsx`**:
- Chat bubble interface (reuses existing LiveChat styling patterns)
- Streaming response display with typing indicator
- Phone number input prompt when AI needs to look up bookings
- Booking detail cards rendered inline (date, service, vehicle, status)
- Footer buttons:
  - "Talk to a human" (visible when `config.agentsOnline && config.enableChat`) -- starts a live chat session with conversation context transferred
  - "Email this conversation" (visible when agents offline or chat disabled) -- calls existing `widget-submit` with the transcript
- Conversation stored in localStorage for session persistence

**New API functions in `api.ts`**:
- `sendAiMessage(widgetKey, messages, visitorPhone?, visitorEmail?)` -- calls the edge function
- `streamAiChat(...)` -- SSE streaming variant

### 3. Widget Admin: Test Mode

**Enable testing in the admin preview panel** (`/admin/widget`):
- Add a toggle: "Test AI Bot" that switches the preview widget into AI mode
- Uses the same edge function but with a `test: true` flag so responses are not persisted
- Allows you to test knowledge base answers and booking lookups from the admin panel

### 4. Translation Updates

Add new keys to all 10 language JSON files:

| Key | English | Norwegian |
|-----|---------|-----------|
| `aiAssistant` | "AI Assistant" | "AI-assistent" |
| `askAnything` | "Ask me anything" | "Spor meg om hva som helst" |
| `talkToHuman` | "Talk to a human" | "Snakk med et menneske" |
| `emailConversation` | "Email this conversation" | "Send samtalen pa e-post" |
| `enterPhone` | "Enter your phone number to look up bookings" | "Skriv inn telefonnummeret ditt for a se bestillinger" |
| `thinking` | "Thinking..." | "Tenker..." |
| `aiGreeting` | "Hi! I'm Noddi's AI assistant..." | "Hei! Jeg er Noddis AI-assistent..." |

### 5. Escalation Flow

```text
Customer chatting with AI
         |
         v
   Can AI answer?
    /          \
  Yes           No
   |             |
   v             v
 Show answer   Show escalation options
               /                    \
     Agents online?            Agents offline?
         |                          |
         v                          v
   "Talk to human"          "Email conversation"
         |                          |
         v                          v
   Start live chat            Submit contact form
   (transfer context)        (with transcript)
```

## Technical Details

### Edge Function: `supabase/functions/widget-ai-chat/index.ts`

- Uses `OPENAI_API_KEY` (already configured as a Supabase secret)
- Uses `NODDI_API_TOKEN` for booking lookups
- Tool-calling flow:
  1. Customer sends message
  2. OpenAI decides if it needs tools (knowledge search, booking lookup)
  3. If tool needed: execute it, feed result back to OpenAI
  4. OpenAI generates final natural language response
  5. Stream response back to widget

### Config.toml Addition

```toml
[functions.widget-ai-chat]
verify_jwt = false
```

### Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/widget-ai-chat/index.ts` | AI chat edge function with tool-calling |
| `src/widget/components/AiChat.tsx` | Chat UI component for the widget |

### Files to Modify

| File | Change |
|------|--------|
| `src/widget/types.ts` | Add `'ai'` to WidgetView, add AI message types |
| `src/widget/api.ts` | Add `sendAiMessage()` and streaming functions |
| `src/widget/components/WidgetPanel.tsx` | Add AI view, modify home screen actions |
| `src/widget/translations/*.json` (10 files) | Add new translation keys |
| `supabase/config.toml` | Add widget-ai-chat function config |

### No Database Changes Required

Conversation history is maintained client-side in the widget (localStorage + in-memory). No new tables needed for Phase 1.

## What This Does NOT Include (Future Phases)

- Booking modifications (reschedule, cancel) -- requires confirming Noddi API write endpoints
- Server-side conversation persistence / analytics tables
- Auto-learning from AI interactions
- Thumbs up/down feedback on AI answers

