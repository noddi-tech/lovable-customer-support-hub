
Goal

- Fix the blank-screen experience first.
- Important: the underlying Lovable preview proxy disconnect after GitHub syncs is platform-side, but we can still fix the user-visible symptom so you stop seeing a white/empty page.

What I found

- `index.html` currently renders only an empty `#root` and loads `/src/main.tsx`.
- If the preview proxy fails to serve the app modules after a Git sync, React never mounts, so the page stays blank.
- Existing error boundaries and loading fallbacks are inside React, so they never appear in that failure mode.
- `ProtectedRoute` also has a smaller in-app blank state because it returns `null` while waiting to redirect unauthenticated users.

Plan

1. Add a static bootstrap screen in `index.html`
   - Show a branded full-screen loading state before React starts.
   - Use inline HTML/CSS only, not Tailwind, because the app CSS is loaded through the JS entrypoint and may never load when the preview proxy breaks.
   - Include clear recovery UI:
     - “Loading Support Hub”
     - after a short timeout: “Preview connection issue detected”
     - actions: refresh preview and open the published app

2. Hide that bootstrap screen only after React actually mounts
   - In `src/main.tsx`, mark the app as mounted and remove/hide the bootstrap overlay after `createRoot(...).render(...)`.
   - Keep the malformed-URL redirect logic as-is.

3. Add a stalled-load timeout in the static shell
   - If mount never happens within a few seconds, swap the loading text to a recovery state.
   - This turns the current white screen into an explicit “the preview connection is stuck” screen.

4. Remove the remaining intentional blank state inside the app
   - In `src/components/auth/ProtectedRoute.tsx`, replace `return null` with a minimal “Redirecting to sign in...” screen.
   - That prevents an empty canvas during auth redirects.

5. Keep the fix focused on graceful recovery
   - Do not spend time tuning Vite/HMR first.
   - The code evidence points to a proxy/module-delivery problem after Git syncs, not a normal React crash.

Files to update

- `index.html`
- `src/main.tsx`
- `src/components/auth/ProtectedRoute.tsx`

Technical details

```text
Current path:
HTML loads -> empty #root -> JS entry fails to load -> white screen

Planned path:
HTML loads -> static bootstrap screen appears
           -> React mounts and hides it
           OR
           -> React never mounts, timeout shows recovery actions
```

Expected result

- You should no longer see a pure blank page after GitHub-triggered syncs.
- If the preview proxy is temporarily broken, you’ll get a visible recovery screen instead.
- Auth redirects will also stop rendering nothing.

Validation

- Normal load: bootstrap screen appears briefly, then app renders.
- Stalled preview load: recovery state appears after timeout.
- Signed-out protected route: redirect message appears instead of blank content.
