# Narrow the sidebar

Reduce the expanded sidebar width so it hugs the navigation labels instead of leaving a wide empty gutter, while still fitting the longest label ("Operations Analytics") on one line.

## Change

- Desktop expanded width: 16rem (256px) → 14rem (224px).
- Collapsed icon width and mobile drawer width stay as they are.
- After the change, verify in the preview that no nav label, group header, account row, or the availability/version footer wraps; if something does, step back up to 14.5rem.

## Technical details

`src/components/ui/sidebar.tsx` — change `SIDEBAR_WIDTH` from `"16rem"` to `"14rem"`. `SIDEBAR_WIDTH_MOBILE` (18rem) and `SIDEBAR_WIDTH_ICON` (3rem) are unchanged. All sidebar surfaces read this via the `--sidebar-width` CSS variable, so no other files need edits.
