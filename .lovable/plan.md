

# Home Dashboard Page

## Overview
Create a dedicated Home page (`/home`) that serves as the landing page after login. It shows a dashboard with unread conversation counts per inbox and quick-link cards to all major sections from the sidebar navigation.

## Changes

### 1. Create Home page component
**New file: `src/pages/HomePage.tsx`**

A clean dashboard layout with:
- **Welcome header** with user's name and current date/time
- **Inbox overview cards** — one card per inbox showing name, color dot, and unread/open conversation count (data from `useOptimizedCounts`)
- **Quick stats row** — total open, unread, assigned, pending counts
- **Section link cards** — grouped cards mirroring the sidebar structure:
  - **Interactions**: Text Messages, Chat, Voice Calls
  - **Marketing**: Campaigns, Newsletters
  - **Operations**: Service Tickets, Doorman, Recruitment, Analytics, Bulk Outreach
  - **Settings**: General, Profile, Admin Portal (if admin)
- Each card has the section icon, label, and brief description, and links to the corresponding route
- Uses existing `Card` components, `useOptimizedCounts` for data, `useAuth` for user info, and nav config from `nav-config.ts` for the link structure
- Responsive grid: 1 col mobile, 2 col tablet, 3-4 col desktop

### 2. Add route for Home page
**File: `src/App.tsx`** (line 89)
- Add `<Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />`
- Change root redirect from `<Navigate to="/interactions/text" replace />` to `<Navigate to="/home" replace />`

### 3. Update Home button link
**File: `src/components/layout/AppMainNav.tsx`** (line 115)
- Change NavLink `to` from `/interactions/text/open` to `/home`

### 4. Update post-login redirect
**File: `src/components/auth/ProtectedRoute.tsx`** — no change needed (already redirects to `/` which will now go to `/home`)

### Files to create/modify
- **Create**: `src/pages/HomePage.tsx`
- **Modify**: `src/App.tsx` — add route + update root redirect
- **Modify**: `src/components/layout/AppMainNav.tsx` — update Home link target

