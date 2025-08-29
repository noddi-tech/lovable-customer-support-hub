# UI Tabs & Buttons QA Checklist

## Manual Testing Checklist

### Desktop (≥1024px)
- [ ] Marketing → Campaigns: Left/right pane tabs have no horizontal scrollbars
- [ ] Admin → Integrations: Tab groups don't overflow or wrap badly  
- [ ] Settings: Long tab labels don't overlap
- [ ] Interactions: Tab layout remains stable
- [ ] Operations: Toolbar buttons don't overlap

### Tablet (≤1024px)
- [ ] Tab labels remain single-line or wrap cleanly without overlapping
- [ ] No horizontal scrollbars appear in tab containers
- [ ] Pane body scrolls properly, tabs stay fixed
- [ ] Touch interactions work smoothly

### Mobile (≤768px)  
- [ ] Tabs wrap to multiple lines when needed
- [ ] No content clipping or overlap
- [ ] All tab content remains accessible
- [ ] Scrolling behavior is intuitive

## Common Issues to Watch For

### ❌ Anti-patterns
- Horizontal scrollbars in tab bars
- `whitespace-nowrap` on tab triggers causing overflow
- `overflow-x-auto` or `overflow-hidden` on tab containers
- Tabs nested inside ScrollArea components
- Missing `min-w-0` on flex containers

### ✅ Correct patterns
- `flex flex-wrap items-center gap-2 min-w-0` on tab containers
- `inline-flex items-center gap-2 leading-none` on triggers (no `whitespace-nowrap`)
- Tabs outside of ScrollArea, only content scrolls
- Stable scrollbar gutters with `[scrollbar-gutter:stable_both-edges]`

## Dev Tools

Enable UI debugging probes during development:
```bash
VITE_UI_PROBE=1 npm run dev
```

Run automated linting:
```bash
npm run lint:tabs
```