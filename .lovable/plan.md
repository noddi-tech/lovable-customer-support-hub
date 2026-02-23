

# Fix Command Palette: Results Hidden + Dark Overlay

## Problem 1: Search results invisible

The `cmdk` library applies its own **client-side text filtering** by default. When the user types "Line drolsum", cmdk checks each `CommandItem`'s `value` prop (e.g. `conv-f414...`, `cust-2696...`) for a match. None match, so cmdk hides every item and sets `--cmdk-list-height: 0px`.

Since we do **server-side searching** via Supabase, cmdk's built-in filter must be turned off.

**Fix:** Add `shouldFilter={false}` to the `Command` component inside `CommandDialog`.

## Problem 2: Header bar gets darkened

The `CommandDialog` renders inside a standard `DialogContent`, which includes a full-screen `DialogOverlay` with `bg-black/80` (80% opacity black). This covers the entire page including the header, making it look "highlighted"/darkened.

**Fix:** Override the overlay to use a lighter opacity for the command palette specifically.

## Changes

### 1. `src/components/ui/command.tsx` — CommandDialog

Update the `CommandDialog` component to:
- Pass `shouldFilter={false}` to the inner `Command` so cmdk does not interfere with server-side search results
- Override the `DialogContent` to use a lighter overlay (e.g. `bg-black/50`) so the backdrop is less aggressive

```tsx
const CommandDialog = ({ children, ...props }: CommandDialogProps) => {
  return (
    <Dialog {...props}>
      <DialogContent className="overflow-hidden p-0 shadow-lg" overlayClassName="bg-black/50">
        <Command
          shouldFilter={false}
          className="[&_[cmdk-group-heading]]:px-2 ..."
        >
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  )
}
```

### 2. `src/components/ui/dialog.tsx` — DialogContent

Add an optional `overlayClassName` prop to `DialogContent` so callers (like `CommandDialog`) can customize the overlay opacity without affecting all dialogs globally.

```tsx
const DialogContent = React.forwardRef<
  ...,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
    overlayClassName?: string;
  }
>(({ className, children, overlayClassName, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay className={overlayClassName} />
    <DialogPrimitive.Content ...>
      {children}
      ...
    </DialogPrimitive.Content>
  </DialogPortal>
))
```

### Files changed

| File | Change |
|---|---|
| `src/components/ui/dialog.tsx` | Add optional `overlayClassName` prop to `DialogContent` |
| `src/components/ui/command.tsx` | Add `shouldFilter={false}` to Command; pass lighter overlay class |

### Why this works

- `shouldFilter={false}` tells cmdk to display all `CommandItem`s as-is without client-side matching -- our Supabase queries handle the filtering
- The lighter overlay (`bg-black/50`) still provides visual focus on the palette without making the header appear "highlighted"
- No other dialogs are affected since the overlay override is opt-in via the new prop

