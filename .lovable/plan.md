

## Fix: Organization metadata overriding white background

### Root cause

The code defaults are correct (`0 0% 100%` = pure white), but the organization's database record (`organizations.metadata.designSystem.colors.background`) has `250 50% 98%` (a purple-tinted grey) stored from a previous save. On every page load, `DesignSystemProvider` fetches this from Supabase and overwrites the CSS variable.

### Fix

**Two changes needed:**

1. **Update the database** — Run a SQL update to set the organization's stored background color to pure white:
   ```sql
   UPDATE organizations 
   SET metadata = jsonb_set(metadata::jsonb, '{designSystem,colors,background}', '"0 0% 100%"')
   WHERE id = 'b9b4df82-2b89-4a64-b2a3-5e19c0e8d43b';
   ```

2. **Protect against future overrides** — In `src/contexts/DesignSystemContext.tsx`, add a safeguard in the `useEffect` that merges database values: always force `background` and `card` to pure white (`0 0% 100%`) after the merge, so even if stale metadata exists in the DB, the app stays white. This can be a simple two-line override after the merge block (~line 335):
   ```typescript
   merged.colors.background = '0 0% 100%';
   merged.colors.card = '0 0% 100%';
   ```

This ensures the white background is enforced regardless of what's stored in the database, while still allowing other design system customizations to load normally.

