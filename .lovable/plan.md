

## Plan: Add Widget API Documentation to Embed Tab

### Current State
The Embed tab only shows: Deploy Widget, Installation, Widget Key, Testing, and Next Steps. The API documentation for the new widget features (`showButton`, `position`, programmatic commands) is missing.

### Changes to `src/components/admin/widget/WidgetEmbedCode.tsx`

#### 1. Add New Imports
```typescript
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Code, BookOpen } from 'lucide-react';
```

#### 2. Add New State
```typescript
const [apiRefOpen, setApiRefOpen] = useState(false);
const [examplesOpen, setExamplesOpen] = useState(false);
```

#### 3. Add API Reference Card (after Widget Key card)

A collapsible card showing:

**Configuration Options Table:**
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `widgetKey` | string | required | Your unique widget identifier |
| `apiUrl` | string | auto | API endpoint (auto-configured) |
| `showButton` | boolean | `true` | Set to `false` to hide the floating button |
| `position` | string | `'bottom-right'` | Position: `'bottom-right'` or `'bottom-left'` |

**Programmatic Commands:**
| Command | Description |
|---------|-------------|
| `noddi('open')` | Open the widget panel |
| `noddi('close')` | Close the widget panel |
| `noddi('toggle')` | Toggle the widget open/closed |

#### 4. Add Code Examples Card

A collapsible card with copy-paste examples:

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
  position: 'bottom-left'
});
```

### UI Structure After Changes

```text
+---------------------------------------+
| Deploy Widget                         |
| [Deploy to Production]                |
+---------------------------------------+

+---------------------------------------+
| Installation                          |
| <embed code snippet>            [Copy]|
+---------------------------------------+

+---------------------------------------+
| Widget Key                            |
| abc-123-xyz                     [Copy]|
+---------------------------------------+

+---------------------------------------+
| API Reference                     [v] |  <-- NEW (collapsible)
| Configuration Options                 |
| - showButton: boolean (default: true) |
| - position: 'bottom-right'/'left'     |
|                                       |
| Programmatic Commands                 |
| - noddi('open')                       |
| - noddi('close')                      |
| - noddi('toggle')                     |
+---------------------------------------+

+---------------------------------------+
| Code Examples                     [v] |  <-- NEW (collapsible)
| Custom Button Integration       [Copy]|
| Position Override               [Copy]|
+---------------------------------------+

+---------------------------------------+
| Testing                               |
| [Test Widget Config API]              |
+---------------------------------------+

+---------------------------------------+
| Next Steps                            |
+---------------------------------------+
```

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/admin/widget/WidgetEmbedCode.tsx` | Add imports, state, API Reference section, Code Examples section with collapsible UI |

### Result

After implementation, developers like Mattis will see:
- Clear documentation of `showButton` and `position` options
- List of `noddi('open')`, `noddi('close')`, `noddi('toggle')` commands
- Ready-to-copy code examples for custom button integration
- All accessible directly in the Embed tab

