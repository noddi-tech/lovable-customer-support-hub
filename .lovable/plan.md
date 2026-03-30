
## Fix plan for “refresh failed” + membership/coupon visibility

### What I found
1. **Refresh failure root cause is real and reproducible in code**  
   In `NoddiCustomerDetails`, when `noddiData` is passed from parent, the hook is called with `null` customer (`externalNoddiData ? null : {...}`), so `refresh()` has no email/phone context and throws:  
   **“Customer email/phone and organization ID are required.”**

2. **Even after refresh, UI can still show stale/parent data**  
   `noddiData` currently prefers external parent state over fetched state, so newly fetched data can be hidden by older `externalNoddiData`.

3. **Backend is returning empty arrays for this specific lookup**  
   A direct forced lookup on this customer returns `noddi-edge-1.8` and:
   - `membership_programs: []`
   - `coupons: []`  
   So for this exact user/group, nothing is rendered (by current conditional UI).

---

### Implementation changes

#### 1) `src/components/dashboard/voice/NoddiCustomerDetails.tsx`
- **Always pass lookup identifiers** to `useNoddihKundeData` (do not pass `null` customer when external data exists).
- Change data precedence to:
  - `fetchedData` first (latest truth)
  - fallback to `externalNoddiData` only when query has not returned yet.
- Keep refresh wired to hook `refresh()`, but now it will have valid identifiers.
- Disable/harden refresh button if identifiers are missing (prevent false error toast).

#### 2) `src/hooks/useNoddihKundeData.ts`
- Keep force refresh path (`forceRefresh: true`) as-is.
- Add a small guard/metadata return (e.g. `canRefresh`) so UI can disable refresh when lookup identity is incomplete.
- Improve error message clarity to distinguish:
  - missing contact identifiers
  - missing organization context

#### 3) Parent panels using `<NoddiCustomerDetails />`
- Keep existing `onDataLoaded` behavior, but ensure parent-provided `noddiData` is treated as temporary fallback, not authoritative override.
- This preserves alternative-email/manual-search UX while allowing real refreshed data to appear immediately.

---

### Verification checklist
1. Open customer details where this issue appears.
2. Click refresh icon:
   - No “email/phone and organization ID are required” toast.
   - Network request should include `forceRefresh: true`.
3. Confirm UI shows latest returned payload (not stale parent copy).
4. Confirm memberships/coupons behavior:
   - If API returns arrays with items → sections render.
   - If API returns empty arrays (as in current lookup) → no section shown (expected).
5. Validate same behavior in both conversation side panel and chat customer panel.

---

### Technical notes
- This is primarily a **state ownership bug** (external prop overriding local query lifecycle), not an edge-function regression.
- Current backend response for the tested customer is valid `1.8` but empty memberships/coupons; that part is data-dependent, not rendering failure.
