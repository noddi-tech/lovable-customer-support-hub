

## Fix: Mention Rendering Highlights Entire Sentence

### Problem
The `MentionRenderer` regex tries to guess where a name ends based on capitalization or spacing — this is inherently fragile. Any text after the name can get swept into the match.

### Scalable Fix: Use Delimiters

Encode mention boundaries at **insert time** in the `MentionTextarea`, then parse the known delimiters at **render time** in `MentionRenderer`.

#### 1. `MentionTextarea` — Insert with markers
**File:** `src/components/ui/mention-textarea.tsx` (line 103)

Change the inserted text from:
```
@Tom Arne Danielsen 
```
to:
```
@[Tom Arne Danielsen] 
```

This explicitly marks where the name starts and ends.

#### 2. `MentionRenderer` — Parse markers
**File:** `src/components/ui/mention-renderer.tsx` (line 16)

Replace the greedy regex with:
```typescript
const mentionPattern = /@\[([A-Za-zÀ-ÖØ-öø-ÿ\s]+?)\]/g;
```

This only matches `@[Name Here]` — no ambiguity, no matter what text follows. The rendered output still displays as `@Tom Arne Danielsen` (the brackets are stripped during rendering).

#### 3. Backward compatibility
Also keep a fallback pattern for old messages that were stored without brackets — use the capitalized-words heuristic as a **secondary** match only:
```typescript
const legacyPattern = /@([A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+(?:\s[A-ZÀ-ÖØ-Ý][a-zà-öø-ÿ]+)*)/g;
```

Run the bracket pattern first; if no matches, fall back to the legacy pattern. New messages will always use brackets.

### Files Changed
| File | Change |
|------|--------|
| `mention-textarea.tsx` | Insert `@[Name]` instead of `@Name` |
| `mention-renderer.tsx` | Parse `@[Name]` pattern, with legacy fallback |

