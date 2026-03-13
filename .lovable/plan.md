

## Fix: Increase Preview Text Length

The preview text is being truncated at **100 characters** on line 214 of `MessageCard.tsx`:

```ts
const previewText = getSmartPreview(message.visibleBody, 100);
```

Since we now have `line-clamp-3` and a taller card (`min-h-[108px]`), we should increase this to ~300 characters so CSS `line-clamp-3` controls the visual truncation instead of the data being pre-truncated.

### Change

**`src/components/conversations/MessageCard.tsx` (line 214)**:
- Change `getSmartPreview(message.visibleBody, 100)` → `getSmartPreview(message.visibleBody, 300)`

Single line change, no other modifications needed.

