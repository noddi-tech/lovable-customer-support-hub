# 2. Stay on Tailwind CSS v3

- Status: Accepted
- Date: 2026-09-02
- Deciders: Support Hub engineering

## Context

Tailwind v4 changes the config format, the plugin API and several utility semantics. The design system, the shadcn component variants and the layout primitives in this app were all built against v3.4.

## Decision

Pin Tailwind at v3.4.17 and do not upgrade to v4. All colors, gradients and shadows stay semantic tokens defined in `index.css` and consumed through shadcn variants; components never hardcode color utilities.

## Consequences

- Theming and dark mode keep working across the whole surface.
- We forgo v4 performance and syntax improvements until a dedicated migration is scheduled.
- Any dependency that requires Tailwind v4 is rejected.
