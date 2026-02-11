
# Make Field Types Dynamic from Component Registry

## Problem

The "Fields to Collect" dropdown in the Data Collection node editor has a hardcoded list of 5 field types (Phone, Email, Text, Number, Date). The Address Search block registers with `applicableFieldTypes: ['address']`, but "address" isn't in the dropdown -- so you can never select it.

## Solution

Make the dropdown dynamically populated from the block registry instead of being hardcoded. Any block that declares `applicableFieldTypes` will automatically appear as an option.

## Changes

### File: `src/components/admin/widget/AiFlowBuilder.tsx`

**1. Update the `DataField` type (line 39)**

Change from:
```typescript
field_type: 'phone' | 'email' | 'text' | 'number' | 'date';
```
To:
```typescript
field_type: string;
```

This allows any registry-defined field type.

**2. Replace the hardcoded Select options (lines 1064-1070)**

Instead of 5 hardcoded `SelectItem`s, dynamically generate them from the registry using `getAllBlocks()`:

```typescript
{getAllBlocks()
  .filter(b => b.flowMeta.applicableFieldTypes?.length)
  .map(b => b.flowMeta.applicableFieldTypes!.map(ft => (
    <SelectItem key={ft} value={ft}>
      {b.flowMeta.icon} {ft.charAt(0).toUpperCase() + ft.slice(1)}
    </SelectItem>
  ))).flat()
}
```

This will show: Phone, Email, Text, Address -- and any future blocks automatically.

**3. Ensure imports**

`getAllBlocks` needs to be imported alongside the existing `getBlockForFieldType` and `getBlockForNodeType`.
