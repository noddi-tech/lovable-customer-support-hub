

## Fix: Slack Daily Digest Formatting

### Problems
1. **Markdown syntax wrong** — The AI prompt uses `**bold**` (markdown) but Slack uses `*bold*` (mrkdwn). The `**` renders literally as shown in the screenshot.
2. **Too long** — The prompt asks for 5 sections with up to 300 words. The AI summary is dumped as one massive `section` block which hits Slack's 3000-char limit and reads poorly.

### Changes

**`supabase/functions/slack-daily-digest/index.ts`**

1. **Fix the AI prompt** (lines 139-155) — Instruct the AI to use Slack mrkdwn formatting (`*bold*`, `_italic_`, `• ` bullets) instead of markdown. Reduce to 3 compact sections and cap at 150 words:
   - *Key Themes* — 3-5 bullet points, one line each
   - *Action Items* — urgent issues + recommendations combined
   - *Sentiment* — one sentence

2. **Add a post-processing step** (after line 176) — Convert any remaining `**text**` to `*text*` in case the AI still outputs markdown bold.

3. **Split the AI summary into structured blocks** (lines 230-240) — Instead of one giant `section` block, split into multiple smaller blocks so Slack renders them cleanly. Keep the AI summary in a single section but ensure it's under 3000 chars by truncating if needed.

4. **Redeploy** the edge function after changes.

### Prompt change (daily)
```
You are a support analytics assistant. Summarize today's customer messages in Slack mrkdwn format.

Use *bold* (single asterisks) for emphasis. Use • for bullets. Be extremely concise.

Format:
*Key Themes*
• Theme 1 — one sentence
• Theme 2 — one sentence

*Action Items*
• Any urgent issues or recommendations

*Sentiment:* One sentence overview.

Max 150 words total.
```

| File | Change |
|---|---|
| `supabase/functions/slack-daily-digest/index.ts` | Fix prompt to use Slack mrkdwn, shorten output, add `**` → `*` post-processing |

