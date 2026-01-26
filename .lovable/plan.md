

## Plan: Add Widget API Documentation to Embed Tab

### Goal
Add a comprehensive API reference section to the Embed tab so developers like Mattis can easily discover and use the widget's configuration options and programmatic commands.

---

### Changes to `src/components/admin/widget/WidgetEmbedCode.tsx`

Add two new documentation cards after the existing content:

#### 1. Configuration Options Card

Shows all available `init` options with descriptions:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `widgetKey` | string | required | Your unique widget identifier |
| `apiUrl` | string | auto | API endpoint (auto-configured) |
| `showButton` | boolean | `true` | Set to `false` to hide the floating button |
| `position` | string | `'bottom-right'` | Override position: `'bottom-right'` or `'bottom-left'` |

#### 2. Programmatic API Card

Documents the command methods:

| Command | Description |
|---------|-------------|
| `noddi('open')` | Open the widget panel |
| `noddi('close')` | Close the widget panel |
| `noddi('toggle')` | Toggle the widget open/closed |

#### 3. Code Examples Card

Provide copy-paste examples for common use cases:

**Custom Button Integration:**
```javascript
// Hide default button, use your own trigger
noddi('init', {
  widgetKey: 'YOUR_KEY',
  apiUrl: '...',
  showButton: false
});

// Open widget from your custom button
document.querySelector('#my-help-btn').addEventListener('click', () => {
  noddi('open');
});
```

**Position Override:**
```javascript
noddi('init', {
  widgetKey: 'YOUR_KEY',
  apiUrl: '...',
  position: 'bottom-left'  // Show on left side
});
```

---

### UI Design

Use collapsible `Accordion` or `Collapsible` components to keep the page clean while making all documentation accessible:

```
┌─────────────────────────────────────────┐
│ 🚀 Deploy Widget                        │
│ [Deploy to Production]                  │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Installation                            │
│ <embed code snippet>              [Copy]│
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Widget Key                              │
│ abc-123-xyz                       [Copy]│
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 📖 API Reference                    [▼] │  ← NEW (collapsible)
├─────────────────────────────────────────┤
│ Configuration Options                   │
│ ┌─────────────────────────────────────┐ │
│ │ showButton  boolean  default: true  │ │
│ │ Set to false to hide floating btn   │ │
│ ├─────────────────────────────────────┤ │
│ │ position    string   default: right │ │
│ │ 'bottom-right' or 'bottom-left'     │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Programmatic Commands                   │
│ ┌─────────────────────────────────────┐ │
│ │ noddi('open')   - Open the panel    │ │
│ │ noddi('close')  - Close the panel   │ │
│ │ noddi('toggle') - Toggle open/close │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 💡 Code Examples                    [▼] │  ← NEW (collapsible)
├─────────────────────────────────────────┤
│ Custom Button Integration         [Copy]│
│ ```javascript                           │
│ noddi('init', { showButton: false });   │
│ noddi('open');                          │
│ ```                                     │
│                                         │
│ Left Position                     [Copy]│
│ ```javascript                           │
│ noddi('init', { position: 'bottom-left' });│
│ ```                                     │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Testing                                 │
│ [Test Widget Config API]                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ 📋 Next Steps                           │
└─────────────────────────────────────────┘
```

---

### Implementation Details

**Imports to add:**
```typescript
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Code, BookOpen } from 'lucide-react';
```

**New state:**
```typescript
const [apiRefOpen, setApiRefOpen] = useState(false);
const [examplesOpen, setExamplesOpen] = useState(false);
```

**Code example snippets with copy buttons:**
Each example will have its own copy button that copies the full code snippet to clipboard.

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/admin/widget/WidgetEmbedCode.tsx` | Add API Reference section, Configuration Options, Programmatic Commands, and Code Examples with collapsible sections |

---

### Result

After implementation, Mattis and other developers will see:
- Clear documentation of `showButton` and `position` options
- List of `noddi('open')`, `noddi('close')`, `noddi('toggle')` commands
- Ready-to-copy code examples for common integrations
- All accessible directly in the Embed tab without needing external docs

