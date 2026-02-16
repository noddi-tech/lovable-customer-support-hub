
# Fix: Edge Function Crash -- `await` in Non-Async Function

## What Is Happening

The `widget-ai-chat` edge function is **completely broken** and cannot boot. Every request returns the fallback error "Beklager, noe gikk galt."

The root cause is a syntax error at line 512: `await executeLookupCustomer(...)` is used inside `patchBookingEdit`, which is declared as a regular (non-async) function. In Deno/V8, `await` inside a non-async function is a syntax error that prevents the entire module from loading.

```
ERROR worker boot error: Uncaught SyntaxError: Unexpected reserved word
    at widget-ai-chat/index.ts:628:41
```

## Fix

### File: `supabase/functions/widget-ai-chat/index.ts`

**Change**: Make `patchBookingEdit` an async function (line 458):

```typescript
// Before:
function patchBookingEdit(reply: string, messages: any[]): string {

// After:
async function patchBookingEdit(reply: string, messages: any[]): Promise<string> {
```

Also update the call site (~line 1455 area) where `patchBookingEdit` is called -- it must now be `await`ed:

```typescript
// Before:
reply = patchBookingEdit(reply, openaiMessages);

// After:
reply = await patchBookingEdit(reply, openaiMessages);
```

### Deploy

Re-deploy `widget-ai-chat` immediately after the fix.

## Expected Result

The edge function boots successfully. The AI assistant responds normally instead of showing the fallback error message.
