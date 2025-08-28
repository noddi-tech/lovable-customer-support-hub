# Debugging Tools

## UIProbe - Tab/Button Overlap Detection

The UIProbe is a development-only diagnostic tool for detecting tab and button overlap issues.

### Usage

Set the environment variable `VITE_UI_PROBE=1` to enable:

```bash
VITE_UI_PROBE=1 npm run dev
```

### What it detects

- `whitespace-nowrap` causing horizontal overflow
- Parent flex containers lacking `flex-wrap`  
- Negative margins on tabs/buttons
- Fixed height with excessive padding
- Overflow hidden with overflowing content
- Visual overlaps between adjacent elements

### Output

When issues are found, UIProbe logs detailed information to the browser console including:
- Element DOM path
- Computed styles
- Element and parent rectangles
- Specific cause of the overlap

Offending elements are also visually outlined in red.

### Cleanup

The UIProbe automatically cleans up visual indicators on unmount and window resize.

## Safe Components

Use these components to prevent overlap issues:

### SafeTabsWrapper
```tsx
<SafeTabsWrapper 
  tabs={[
    { value: 'tab1', label: 'Tab 1', content: <div>Content</div> },
    { value: 'tab2', label: 'Tab 2', content: <div>Content</div> }
  ]}
  spacing="normal" // tight | normal | loose
  wrap={true}
/>
```

### SafeToolbar
```tsx
<SafeToolbar spacing="normal" justify="start" wrap={true}>
  <Button>Action 1</Button>
  <Button>Action 2</Button>
  <Button>Action 3</Button>
</SafeToolbar>
```

## Lint Script

Run the tabs spacing lint check:

```bash
npm run lint:tabs
```

This script checks for risky patterns that commonly cause overlap issues.