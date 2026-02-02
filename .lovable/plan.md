

# Rich Text Editor + Quality Score Management for Knowledge Base

## Overview

You've raised two important questions:

1. **Rich Text Formatting** - The HelpScout screenshots show a formatting toolbar (Bold, Italic, Underline, Links, Lists, etc.) for knowledge articles. Currently, knowledge entries use plain text only.

2. **Quality Score** - Entries start at 3.0 by default. The score is meant to improve automatically based on usage, but you can also manually curate entries.

---

## Part 1: Rich Text Editor for Agent Responses

### Current State

- `agent_response` is stored as plain text in the `knowledge_entries` table
- When displayed in the entry list and in AI suggestions, it renders as-is
- No formatting toolbar exists

### Solution

Add a lightweight rich text editor for the **Agent Response** field, similar to HelpScout's editor. This allows agents to create formatted responses with:

- **Bold**, *Italic*, Underline
- Hyperlinks (clickable URLs like "Go to Noddi.no")
- Bullet lists and numbered lists
- Headings (optional)

### Recommended Library: `react-simple-wysiwyg`

This is a minimal, dependency-free WYSIWYG editor perfect for this use case:

```text
Package: react-simple-wysiwyg
Size: ~8KB minified
Features: Bold, Italic, Underline, Link, Lists, Headings
```

No configuration needed - it just works and outputs clean HTML.

### Implementation

| Component | Changes |
|-----------|---------|
| **Create Entry Dialog** | Replace `Textarea` with rich text editor for agent response |
| **Edit Entry Dialog** | Replace `Textarea` with rich text editor for agent response |
| **Entry Card Display** | Render HTML safely using DOMPurify (already installed) |
| **AI Suggestions** | Include HTML in prompts; render formatted in UI |

### Storage Format

The `agent_response` column will store HTML instead of plain text:

```text
Before: "Go to Noddi.no and click on Log in..."
After:  "Go to <a href="https://noddi.no">Noddi.no</a> and click on <strong>Log in</strong>..."
```

### UI Component

```text
+----------------------------------------------------------+
| Agent Response                                            |
+----------------------------------------------------------+
| B  I  U  🔗  ≡  1.  ...                                   |
+----------------------------------------------------------+
|                                                           |
| Go to Noddi.no and click on Log in. From there...         |
|                                                           |
+----------------------------------------------------------+
```

---

## Part 2: Quality Score System

### How Quality Score Works

The quality score (0-5 scale) is calculated automatically based on:

| Factor | Weight | Description |
|--------|--------|-------------|
| Customer Satisfaction | 40% | Feedback ratings from customers |
| Resolution Rate | 40% | % of conversations resolved using this response |
| Reply Speed | 20% | Bonus for quick responses |
| Agent Refinement | +0.5 | Bonus when agent manually improves the response |

**Default of 3.0**: Manually created entries start at 3.0 (neutral). Auto-promoted entries get calculated scores.

### How to Improve Quality Scores

There are two approaches:

#### Option A: Automatic Improvement (Current System)

1. **Use the response** - Every time an AI suggestion based on this entry is used, `usage_count` increases
2. **Track outcomes** - When conversations are resolved successfully, `acceptance_count` increases
3. **Run auto-promote job** - The `auto-promote-responses` edge function recalculates scores based on outcomes

The score improves naturally as successful responses are reused.

#### Option B: Manual Quality Control (New Feature)

Add ability to manually set/adjust quality scores for curated entries:

```text
+---------------------------+
| Quality Score             |
+---------------------------+
| ⭐ ⭐ ⭐ ⭐ ⭐              |
| Click to rate 1-5         |
+---------------------------+
```

This allows admins to:
- Boost high-quality curated responses (set to 4.5-5.0)
- Mark mediocre entries for improvement (set to 2.0-3.0)
- Prioritize which entries get suggested first (sorted by score)

---

## Implementation Summary

### Files to Create

| File | Purpose |
|------|---------|
| `src/components/ui/simple-rich-editor.tsx` | Wrapper component for react-simple-wysiwyg |

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/dashboard/knowledge/KnowledgeEntriesManager.tsx` | Replace Textarea with rich editor, add quality score control, render HTML in display |
| `package.json` | Add `react-simple-wysiwyg` dependency |

### Database Changes

None required - the `agent_response` column is already `text` type which handles HTML.

### Security

Use DOMPurify (already installed) to sanitize HTML before rendering to prevent XSS attacks.

---

## User Experience Flow

### Creating/Editing an Entry

1. Admin fills in "Customer Context" (plain text)
2. Admin uses rich text editor for "Agent Response" with formatting toolbar
3. Admin can optionally set a quality score (1-5 stars) for manually curated entries
4. Entry is saved with HTML formatting

### Viewing Entries

1. Entry cards show formatted HTML preview (links are clickable, bold is visible)
2. Quality score displays as stars with color coding
3. Manual quality score control available in edit dialog

### AI Suggestions

1. When similar customer question comes in, formatted responses are suggested
2. Agent sees the nice formatting in suggestion panel
3. When used, the HTML is inserted into reply composer

---

## Quality Score Color Guide

| Score | Color | Meaning |
|-------|-------|---------|
| 4.5+ | Green | Excellent - prioritized in suggestions |
| 3.5-4.4 | Yellow | Good - used regularly |
| Below 3.5 | Red | Needs improvement or review |

