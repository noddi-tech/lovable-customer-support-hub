

# Fix Mobile "Back to Inbox" Navigation

## Root Cause
Both `MobileEmailConversationView` and `MobileChatConversationView` have a `handleBack` function that only removes `?c=` from query params — a leftover from the old query-param-based routing. The app now uses path-based routing (`/interactions/text/conversations/:id`), so deleting `?c=` does nothing and the user stays on the same page.

## Fix
Replace `handleBack` in both mobile components with the centralized `canGoBackInApp()` / `getConversationBackPath()` pattern already used by `ConversationHeader.tsx`.

### File: `src/components/mobile/conversations/MobileEmailConversationView.tsx`
- Import `useNavigate` from react-router-dom (replace `useSearchParams`)
- Import `canGoBackInApp`, `getConversationBackPath` from `@/utils/conversationNavigation`
- Replace `handleBack`:
  ```tsx
  const navigate = useNavigate();
  const handleBack = () => {
    if (canGoBackInApp()) {
      navigate(-1);
    } else {
      navigate(getConversationBackPath(window.location.pathname));
    }
  };
  ```
- Remove unused `searchParams` / `setSearchParams` if no longer needed

### File: `src/components/mobile/conversations/MobileChatConversationView.tsx`
- Same changes: import `useNavigate`, import navigation helpers, replace `handleBack`
- Remove unused `useSearchParams` if no longer needed

### Files to modify
- `src/components/mobile/conversations/MobileEmailConversationView.tsx`
- `src/components/mobile/conversations/MobileChatConversationView.tsx`

