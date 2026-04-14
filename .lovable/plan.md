

# Home Dashboard UI Redesign

## Overview
Redesign the Home page to be cleaner and more polished, inspired by the reference screenshot but keeping the app's existing white/light theme. Key improvements: larger stat cards with icons and trend indicators, cleaner inbox grid with badge-style counts, and section cards with centered icon+label layout instead of the current compact row style.

## Changes

### File: `src/pages/HomePage.tsx` — full rewrite of the layout

**1. Stats row — larger, cleaner cards**
- Each stat card gets a larger layout: big number on the left, icon on the top-right corner (muted), label below the number
- Remove the colored left-border approach; use a subtle `bg-muted/30` background instead
- Keep existing click navigation

**2. Inboxes section — cleaner grid with badges**
- Add a section header row with "INBOXES" label (uppercase, small, muted) and a "View all >" link
- 3 columns on large screens, 2 on medium
- Each inbox card: colored dot + name on the left, open count as a `Badge` on the right
- Show unread count only if > 0, as a small red dot/badge next to the open badge
- Remove the separate "open" sub-label — just show the badge like "3 open"

**3. Section link cards — centered icon+label layout**
- Section headers: uppercase muted text (e.g., "INTERACTIONS", "MARKETING")
- Cards become taller with the icon centered above the label text
- Remove the colored left border; use a clean card with subtle hover shadow
- Keep the `ArrowRight` on hover but position it in the top-right corner
- Grid: 3 columns on large, 2 on small

**4. General polish**
- Use `Separator` between major sections for visual clarity
- Consistent spacing with `space-y-8` between sections
- Section headers use `text-xs font-semibold uppercase tracking-wider text-muted-foreground`

### No other files need changes
All data hooks and navigation config remain the same.

