

## Why animations differ between sidebar items — and fix

### Root Cause

When clicking **Text Messages, Chat, Search, Notifications** — these all stay within the `interactions` section. The `EnhancedInteractionsLayout` (or similar) remains mounted and only swaps its inner content. The sidebar collapse animation plays smoothly against a stable background.

When clicking **Newsletters, Tickets, Doorman**, etc. — the route changes to a completely different section (`/marketing/*`, `/operations/*`). This causes the previous page component to fully unmount and the new one to mount from scratch. The abrupt DOM swap creates a jarring visual — no fade, no transition — just a hard cut.

### Fix: Add a page transition wrapper

Wrap the `{children}` slot in `UnifiedAppLayout.tsx` with a CSS fade-in transition keyed to the current route section, so every page swap gets a brief fade-in animation.

| # | File | Change |
|---|------|--------|
| 1 | `src/components/layout/UnifiedAppLayout.tsx` | Wrap `{children}` in a `<div>` with a `key` based on the top-level route segment and apply a `animate-fade-in` class. This re-triggers the fade on every section change. |

The implementation:
```tsx
const location = useLocation();
const section = location.pathname.split('/')[1] || 'home';

// In the render:
<main className="flex-1 min-h-0 w-full max-w-none overflow-auto bg-background">
  <div key={section} className="h-full animate-fade-in">
    {children}
  </div>
</main>
```

This uses the existing `animate-fade-in` keyframe (already defined in tailwind config) — a 0.3s ease-out opacity+translateY animation. The `key={section}` ensures React remounts the wrapper (and replays the animation) only when the top-level section changes, not on sub-navigation within the same section.

No new dependencies. No behavior changes. Just visual consistency.

