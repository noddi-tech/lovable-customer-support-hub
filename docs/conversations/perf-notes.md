# Conversation Performance Analysis

## Current Heavy Operations on First Open

### 1. Full Thread Render
- **Location**: `MessagesList.tsx` renders all messages immediately
- **Issue**: Loads entire conversation history on open, no pagination
- **Impact**: Large conversations (50+ messages) cause slow initial render

### 2. Data Flow
- **Context**: `ConversationViewContext.tsx` fetches full message list
- **Query**: Single query for all messages in `ascending: true` order
- **No Pagination**: Backend doesn't support cursor-based paging yet

### 3. DOM Rendering
- **All Messages**: Every message rendered as `Card` component immediately
- **Heavy Components**: `EmailRender` processes HTML/attachments for all messages
- **No Virtualization**: Large conversations create large DOM trees

### 4. Bundle Loading
- **Reply Editor**: All composer components loaded upfront
- **No Lazy Loading**: Editor bundle blocks first paint

## Target Optimizations

1. **Progressive Loading**: Show 3 newest messages first, load older on demand
2. **Quoted Text Collapse**: Hide quoted content by default with toggle
3. **Lazy Composer**: Load reply editor only when needed
4. **Client-side Pagination**: Simulate pagination until backend supports it

## Performance Goals
- **Time to Content**: < 800ms from click to 3 newest messages visible
- **Memory Usage**: Reduce initial DOM size by ~70% for large conversations
- **Bundle Size**: Reduce initial JS by lazy-loading reply editor