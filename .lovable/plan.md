# Simplify the sign-in screen

Strip the login card down to just the title and the two sign-in buttons.

## Changes

In `src/pages/Auth.tsx` (main sign-in view):

1. Remove the logo image block (the 16x16 `logo-support-hub.png` wrapper).
2. Remove the `Sign in to continue` card description.
3. Remove the helper paragraph "Navio scopes access to your service organizations. Google is for Noddi employees."

Keep the "Noddi Support Hub" title, the Navio and Google buttons, and all error alerts. Header spacing tightens slightly since the logo is gone.

No logic, auth, or routing changes.
