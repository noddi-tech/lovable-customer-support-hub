

# Fix: Address Listing as Text + LICENSE_PLATE Raw Text Rendering

## Problems

1. **AI lists addresses as text before the interactive marker**: The AI writes "Her er adressene dine:" followed by bullet points, then separately shows the ADDRESS_SEARCH component. The prompt needs to explicitly forbid any introductory text about addresses.

2. **LICENSE_PLATE marker renders as raw text**: The AI is outputting `[LICENSE_PLATE]{"stored":[]}` followed by `[/LICENSE_PLATE]` but it appears as literal text in the chat. Root cause: the AI may be wrapping the marker in markdown formatting (backticks, code block) or adding newlines/spaces that prevent parsing.

## Changes

### Change 1: Strengthen prompt instructions (widget-ai-chat/index.ts)

Update the INTERACTIVE COMPONENTS section (~lines 988-998):

**ADDRESS_SEARCH (line 988-992)** - Replace with:
```
8. ADDRESS SEARCH - render an interactive address picker with search:
When you need to collect an address, output ONLY the marker - no introductory text, no list of addresses, no "Here are your addresses".
With stored addresses: [ADDRESS_SEARCH]{"stored": [{"id": 2860, "label": "Holtet 45, 1368 Oslo", "zip_code": "1368", "city": "Oslo"}]}[/ADDRESS_SEARCH]
Without stored addresses: [ADDRESS_SEARCH][/ADDRESS_SEARCH]
The component handles everything - showing stored addresses as selectable options AND a search field for new addresses.
```

**LICENSE_PLATE (lines 994-998)** - Replace with:
```
9. LICENSE PLATE - render a license plate input with car lookup:
When you need to collect a car, output ONLY the marker on a single line with NO line breaks inside.
With stored cars: [LICENSE_PLATE]{"stored": [{"id": 13888, "make": "Tesla", "model": "Model Y", "plate": "EC94156"}]}[/LICENSE_PLATE]
Without stored cars: [LICENSE_PLATE][/LICENSE_PLATE]
The component handles everything. Do NOT add any text describing the marker itself.
```

### Change 2: Add explicit anti-pattern rules (RULES FOR MARKERS section, ~line 1011)

Add these rules:
```
- When outputting ADDRESS_SEARCH, LICENSE_PLATE, or SERVICE_SELECT markers: output the marker DIRECTLY with no preceding description of addresses, cars, or services. Do NOT say "Here are your addresses" or "Enter your license plate" before the marker.
- Each marker must be on a single continuous line with NO line breaks between the opening tag, content, and closing tag.
- Example of WRONG format (line breaks inside marker):
  [LICENSE_PLATE]{"stored":[]}
  [/LICENSE_PLATE]
- Example of CORRECT format (single line):
  [LICENSE_PLATE]{"stored":[]}[/LICENSE_PLATE]
```

### Change 3: Frontend resilience - handle newlines in markers (parseMessageBlocks.ts)

Add a pre-processing step to normalize the content before parsing, collapsing any newlines between opening and closing marker tags. This prevents the parser from failing when the AI inserts line breaks inside markers:

```typescript
// Before parsing, collapse newlines between marker tags
// e.g. "[LICENSE_PLATE]{"stored":[]}\n[/LICENSE_PLATE]" -> "[LICENSE_PLATE]{"stored":[]}[/LICENSE_PLATE]"
```

This adds a regex replacement for each registered block that has a closing marker, removing whitespace/newlines between the opening tag content and closing tag.

## Deployment

- Redeploy `widget-ai-chat` edge function
- No other deployment needed (frontend change auto-deploys)

