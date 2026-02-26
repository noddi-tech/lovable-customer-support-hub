

## Default Customer Details Panel to Open

### Problem
In live chat view, the customer info panel (`showNoddiPanel`) defaults to `false`, requiring users to click the "i" button to see customer details. It should default to open.

### Change

**File: `src/components/dashboard/conversation-view/ConversationViewContent.tsx` (line 105)**

Change the default state from `false` to `true`:

```typescript
// Before
const [showNoddiPanel, setShowNoddiPanel] = useState(false);

// After
const [showNoddiPanel, setShowNoddiPanel] = useState(true);
```

That's it. The toggle button (line 247-259) already works correctly to hide/show the panel -- this just flips the default so it starts open. The email view side panel (`sidePanelCollapsed`) already defaults to visible, so no change needed there.

