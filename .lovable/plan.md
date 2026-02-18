
# Add "Copy Documentation for Slack" Button

## What This Does

Adds a button to the widget admin page that copies all the widget documentation (embed code, API reference, configuration options, programmatic commands, and code examples) as nicely formatted plain text that pastes well into Slack and other messaging tools.

Slack uses its own markdown-like formatting (`*bold*`, `` `code` ``, ``` ```code blocks``` ```), so the copied text will use that format.

## Changes

**File: `src/components/admin/widget/WidgetEmbedCode.tsx`**

1. Add a new state variable `copiedDocs` for the copy button feedback.

2. Add a helper function `generateSlackFormattedDocs()` that builds a single string with all documentation formatted for Slack:

```
*Noddi Contact Widget - Setup Guide*

*Installation*
Paste this before </body>:
```html
<!-- embed code here -->
```

*Widget Key:* `abc123...`

*Configuration Options*
| Option | Type | Default | Description |
| widgetKey | string | required | Your unique widget identifier |
| apiUrl | string | auto | API endpoint (auto-configured) |
| showButton | boolean | true | Set to `false` to hide the floating button |
| position | string | 'bottom-right' | 'bottom-right' or 'bottom-left' |

*Programmatic Commands*
- `noddi('open')` - Open the widget panel
- `noddi('close')` - Close the widget panel
- `noddi('toggle')` - Toggle the widget open/closed

*Code Examples*
// custom button example
// position override example
```

3. Add a "Copy Docs for Slack" button at the top of the page (next to or below the Deploy section), using a clipboard/share icon. On click it copies the formatted text and shows a "Copied!" confirmation.

The button will be placed in a small card at the top of the component, styled consistently with the existing UI.
