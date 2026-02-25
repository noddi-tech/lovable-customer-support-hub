
## Add Translation to Chat Reply Input

Add the same translation popover to the live chat `ChatReplyInput` that already exists in the text message `ReplyArea`. The text message translation remains unchanged.

### Changes

**File: `src/components/conversations/ChatReplyInput.tsx`**

1. **Add imports**: `Languages` icon from lucide-react, `Label` from UI components

2. **Add state variables** (3 new):
   - `translateLoading` (boolean, default false)
   - `sourceLanguage` (string, default `'auto'`)
   - `targetLanguage` (string, default `'no'`)

3. **Add languages list** (same as used in `NewConversationDialog` and `ReplyArea`):
   ```text
   auto=Auto Detect, en=English, no=Norwegian, sv=Swedish, da=Danish, de=German, fr=French, es=Spanish
   ```

4. **Add `handleTranslate` function**: Calls `supabase.functions.invoke('translate-text', { body: { text: message, sourceLanguage, targetLanguage } })` directly (same pattern as `NewConversationDialog`). On success, replaces `message` state with translated text. Shows toast on error.

5. **Add Translate button + Popover** in the input bar between the attachment button and the message input (next to emoji/paperclip):
   - Ghost icon button with `Languages` icon (same `h-9 w-9` sizing as emoji/attachment buttons)
   - Popover containing:
     - "Translate" header
     - "From" language selector (includes auto-detect)
     - "To" language selector (excludes auto-detect)
     - "Translate" action button with loading spinner

### UI placement

```text
[Emoji] [Attach] [Translate] [............message input............] [Mic] [Send] [Transfer] [End]
```

### What stays the same

- The existing translation in `ReplyArea` (text messages) is untouched
- The `translate-text` edge function is reused as-is
- No new dependencies needed -- all UI components already imported or available in the file
