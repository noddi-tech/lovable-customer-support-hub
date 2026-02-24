

## Compact Sidebar Header: Org Selector, Chat & Phone

Make the Organization Switcher, Chat availability, and Phone sections in the sidebar header match the ultra-compact toolbar style used in the conversation list (9px uppercase labels, xxs-sized controls, 10px text).

### Changes

**File: `src/components/organization/OrganizationSwitcher.tsx`**

1. **Reduce outer padding**: Change `px-3 py-2` to `px-1.5 py-0`
2. **Shrink icons**: Change `h-4 w-4` to `h-3 w-3` on Building2/Globe icons
3. **Shrink Select trigger**: Add `h-7 text-[10px]` and reduce width from `w-[200px]` to `w-[160px]`
4. **Shrink "Filtered" badge**: Change `text-xs` to `text-[9px]` and reduce padding
5. **Add section label**: Add `text-[9px] text-muted-foreground uppercase tracking-wide font-medium` label reading "Organization" above the selector

**File: `src/components/layout/AgentAvailabilityPanel.tsx`** (expanded mode, lines 212-393)

1. **Section header**: Change `text-xs` to `text-[9px]` on the "AVAILABILITY" label (already uppercase, just resize)
2. **Chat sub-label**: Change `text-xs` to `text-[9px]` on the "Chat" / "Phone" sub-labels, icons from `h-3 w-3` to `h-2.5 w-2.5`
3. **Chat dropdown button**: Change from `h-8` to `h-7`, text from `text-sm` to `text-[10px]`, shrink status circle from `h-3 w-3` to `h-2 w-2`
4. **Phone login button**: Change from `h-8 text-sm` to `h-7 text-[10px]`
5. **Phone logout button**: Align to same compact sizing
6. **Section backgrounds**: Change `p-2` to `p-1.5` on the `bg-muted/30` containers
7. **Online agents section**: Shrink text from `text-xs` to `text-[9px]`, avatar from `h-5 w-5` to `h-4 w-4`
8. **Outer padding**: Change `px-3` to `px-1.5` to match toolbar horizontal padding

### Visual result

```text
ORGANIZATION
[lock] Noddi v          Filtered

AVAILABILITY
Chat
 * Offline              v

Phone
 [-> Login to Aircall]

No other agents online
```

All text at 9-10px, all controls at h-7, matching the conversation list toolbar density.

### Technical notes

- No structural changes, only class name adjustments
- Both files: swap size classes to match the `xxs` button variant convention (h-7, text-[10px], px-3)
- Section labels: `text-[9px] uppercase tracking-wide font-medium text-muted-foreground`
- The collapsed/popover mode in AgentAvailabilityPanel is left unchanged since it already uses compact sizing

