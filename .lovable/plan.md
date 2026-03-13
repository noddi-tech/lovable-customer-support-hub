

## Polish Collapsed Message Card: Date Styling & Spacing

### Changes in `src/components/conversations/MessageCard.tsx`:

1. **Add spacing between preview text and header** (line 415): Change `pl-[26px] pb-1 pr-4` → `pl-[26px] pt-1.5 pb-1 pr-4` to add top padding to the preview block.

2. **Bold the date/time and add calendar icon** (lines 369-374): Add a `Calendar` icon import and update the timestamp span:
   - Add `Calendar` to the lucide-react import
   - Change the timestamp from plain text to include a calendar icon and `font-semibold`:
   ```tsx
   <span className={cn(
     "text-muted-foreground shrink-0 flex items-center gap-1",
     effectiveCollapsed ? "text-xs leading-none" : "text-sm"
   )}>
     <Calendar className="w-3 h-3" />
     <span className="font-semibold">
       {dateTime(...)}
     </span>
   </span>
   ```

Two small tweaks — no structural changes.

