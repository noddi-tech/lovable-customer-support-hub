

# Fix Address Search Block Sandbox: Enable Interactive Testing

## Problem

When you click "Try it" on the Address Search block, the input renders but nothing happens when you type. This is because the sandbox doesn't pass `widgetKey` to the component, and the component skips all API calls when `widgetKey` is missing (`if (!widgetKey) return`).

## Solution

Two changes:

### 1. Pass `widgetKey` in sandbox mode

In `ComponentLibrary.tsx`, the sandbox renders `<block.component>` without `widgetKey`. Adding `widgetKey="sandbox"` will allow the Address Search block to make real API calls to the edge function (the edge function doesn't validate widget keys -- it just proxies to Noddi's API).

This is a one-line change in the `BlockCard` component where the sandbox renders:

```
<block.component
  primaryColor="hsl(var(--primary))"
  messageId="sandbox-preview"
  blockIndex={0}
  usedBlocks={new Set()}
  widgetKey="sandbox"          // <-- add this
  onAction={...}
  data={getSampleData(block.type)}
/>
```

### 2. Add sample data for `address_search`

In `getSampleData`, add an entry for the address search block:

```
case 'address_search':
  return { placeholder: 'Search your address...' };
```

## Files Changed

| File | Change |
|------|--------|
| `src/components/admin/widget/ComponentLibrary.tsx` | Add `widgetKey="sandbox"` to the sandbox `block.component` render (~line 272). Add `address_search` case in `getSampleData`. |

## Result

After this fix, typing in the Address Search sandbox will:
1. Call the `noddi-address-lookup` edge function for real suggestions
2. Show the dropdown with matching addresses
3. On selection, resolve the address and show the delivery area result
4. Fire a toast with the action value

