

## Plan: Add Widget API for Programmatic Control and Position Override

### What Mattis Needs

Based on the conversation with Mattis, the Noddi widget needs to support:

1. **Hide the floating button** (`showButton: false`) - Render widget without the default button, allowing the customer app to use its own custom button
2. **Position override** (`position: "left"`) - Override the default position from admin config
3. **Programmatic open/close** - Expose API methods like `noddi('open')` and `noddi('close')` to control the widget

This mirrors the Help Scout Beacon API pattern Mattis shared:
```javascript
window.Beacon('config', {
  showBeacon: false, // Hide the launcher button
  enableChat: true,
  display: { position: "left" }
});
```

---

### Implementation Changes

#### 1. Update `WidgetInitOptions` (src/widget/types.ts)

Add new optional config parameters:

```typescript
export interface WidgetInitOptions {
  widgetKey: string;
  apiUrl?: string;
  // NEW: Client-side overrides
  showButton?: boolean;      // Default: true - set to false to hide the floating button
  position?: 'bottom-right' | 'bottom-left';  // Override admin config position
}
```

---

#### 2. Update Widget Component (src/widget/Widget.tsx)

Accept and apply the new options:

```typescript
export const Widget: React.FC<WidgetProps> = ({ options }) => {
  const [isOpen, setIsOpen] = useState(false);
  // ... existing state

  // Apply position override from init options, or fall back to config
  const effectivePosition = options.position ?? config?.position ?? 'bottom-right';
  
  // Determine if button should be shown (default: true)
  const showButton = options.showButton !== false;

  return (
    <div className="noddi-widget-container">
      {isOpen && (
        <WidgetPanel 
          config={config} 
          onClose={() => setIsOpen(false)}
          positionOverride={effectivePosition}  // Pass override to panel
        />
      )}
      {showButton && (
        <FloatingButton
          isOpen={isOpen}
          onClick={() => setIsOpen(!isOpen)}
          primaryColor={config.primaryColor}
          position={effectivePosition}
        />
      )}
    </div>
  );
};
```

---

#### 3. Expose Global API Methods (src/widget/index.tsx)

Add `open`, `close`, and `toggle` commands for programmatic control:

```typescript
let widgetRef: { setIsOpen: (open: boolean) => void } | null = null;

function initializeWidget(options: WidgetInitOptions) {
  // ... existing init code
  
  // Store ref for programmatic control
  root.render(
    <Widget 
      options={options} 
      onMount={(api) => { widgetRef = api; }} 
    />
  );
}

// Extended global API
window.NoddiWidget = Object.assign(
  function(command: string, options?: any) {
    switch (command) {
      case 'init':
        if (options?.widgetKey) initializeWidget(options);
        break;
      case 'open':
        widgetRef?.setIsOpen(true);
        break;
      case 'close':
        widgetRef?.setIsOpen(false);
        break;
      case 'toggle':
        // Toggle current state
        break;
    }
  },
  {
    init: initializeWidget,
    open: () => widgetRef?.setIsOpen(true),
    close: () => widgetRef?.setIsOpen(false),
    q: window.NoddiWidget?.q || [],
  }
);
```

---

#### 4. Update WidgetPanel Position Handling (src/widget/components/WidgetPanel.tsx)

Accept position override prop:

```typescript
interface WidgetPanelProps {
  config: WidgetConfig;
  onClose: () => void;
  positionOverride?: 'bottom-right' | 'bottom-left';
}

export const WidgetPanel: React.FC<WidgetPanelProps> = ({ 
  config, 
  onClose,
  positionOverride 
}) => {
  // Use override if provided, otherwise fall back to config
  const position = positionOverride ?? config.position;
  
  const positionStyles = position === 'bottom-right' 
    ? { right: '20px' } 
    : { left: '20px' };
  
  // ... rest of component
};
```

---

### Usage Examples for Mattis

**1. Hide button, use custom trigger:**
```javascript
noddi('init', {
  widgetKey: 'abc123',
  apiUrl: '...',
  showButton: false  // Hide the floating button
});

// Their custom button
document.querySelector('#my-chat-btn').addEventListener('click', () => {
  noddi('open');
});
```

**2. Override position to left:**
```javascript
noddi('init', {
  widgetKey: 'abc123',
  apiUrl: '...',
  position: 'bottom-left'  // Override admin config
});
```

**3. Full control (hide button + custom position):**
```javascript
noddi('init', {
  widgetKey: 'abc123',
  apiUrl: '...',
  showButton: false,
  position: 'bottom-left'
});

// Programmatic control
noddi('open');   // Open the chat panel
noddi('close');  // Close the panel
noddi('toggle'); // Toggle open/closed
```

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/widget/types.ts` | Add `showButton` and `position` to `WidgetInitOptions` |
| `src/widget/Widget.tsx` | Handle new options, conditionally render button, expose API ref |
| `src/widget/index.tsx` | Add `open`, `close`, `toggle` commands to global API |
| `src/widget/components/WidgetPanel.tsx` | Accept position override prop |
| `src/widget/components/FloatingButton.tsx` | No changes needed (already accepts position prop) |

---

### After Implementation

1. **Deploy widget** using the "Deploy to Production" button
2. **Share new API docs** with Mattis showing the new options
3. **Test in BF app** by hiding button and using custom trigger

