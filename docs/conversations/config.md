# Conversation Performance Configuration

## Performance Settings

The conversation loading behavior can be customized with these constants:

### Message Loading
```typescript
// src/hooks/conversations/useConversationMessages.ts
const INITIAL_VISIBLE_COUNT = 3; // Number of newest messages shown on first load
const PAGE_SIZE = 10;            // Number of messages loaded per page when fetching older
```

### Environment Variables
```bash
# Enable performance debugging (development only)
VITE_UI_PROBE=1
```

## Configuration Options

### INITIAL_VISIBLE_COUNT
- **Default**: 3
- **Purpose**: Controls how many of the newest messages are shown immediately when opening a conversation
- **Impact**: Lower values = faster initial load, higher values = more context visible immediately
- **Recommendation**: 2-5 messages for optimal balance

### PAGE_SIZE  
- **Default**: 10
- **Purpose**: Controls how many older messages are loaded when user scrolls to top or clicks "Load older"
- **Impact**: Higher values = fewer network requests but larger data transfers
- **Recommendation**: 10-20 messages per page

### Quoted Text Collapse
- **Default**: Enabled (quoted content collapsed by default)
- **Purpose**: Reduces visual clutter and improves readability
- **Toggle**: Users can expand quoted content with "Show quoted text" button

## Remaining Count Algorithm

### Count Calculation
The "Load older messages" button shows remaining count based on:
- **High confidence**: Shows exact count when normalization ratio > 90%
- **Medium confidence**: Shows exact count when normalization ratio > 70%
- **Low confidence**: Hides count when normalization ratio < 70%
- **Large counts**: Hides count when remaining > 500 messages

### Confidence Levels
```typescript
// Calculated based on raw vs normalized message ratio
const normalizationRatio = normalizedMessages.length / rawMessages.length;
```

## Quoted Content Detection

### Supported Patterns
- **Gmail**: `On [date] wrote:`, multi-language support (Norwegian: `Den/På [date] skrev:`)
- **Outlook**: `-----Original Message-----`, email headers (`From:`, `Sent:`, `To:`)
- **Apple Mail**: `Begin forwarded message:`
- **HTML**: `.gmail_quote`, `.outlook_quote`, `blockquote`, `[style*="border-top"]`
- **Generic**: Lines starting with `>` or `&gt;`

### Deduplication Strategy
1. **Primary**: Message ID matching
2. **Secondary**: Soft key = `${sender}-${date}-${contentHash}`
3. **Chronological**: Maintains time order after deduplication

## Performance Targets

### Time to Content
- **Target**: < 800ms from conversation click to visible messages
- **Measured**: From user click to 3 newest messages rendered

### Memory Usage
- **Target**: 70% reduction in initial DOM size for large conversations
- **Method**: Progressive loading + lazy composer + quoted content collapse

### Bundle Size
- **Target**: Reduce initial JS by lazy-loading reply editor
- **Method**: Load composer only when user clicks "Reply"

## Monitoring

When `VITE_UI_PROBE=1` is enabled, performance timing logs will be shown in console:
- Initial conversation load time
- Message fetch duration  
- Render completion time

## Customization

To adjust settings for your use case:

1. **Large Conversations (100+ messages)**: Reduce `INITIAL_VISIBLE_COUNT` to 2
2. **Fast Networks**: Increase `PAGE_SIZE` to 20
3. **Mobile Users**: Keep defaults (optimized for slower connections)
4. **Power Users**: Consider increasing `INITIAL_VISIBLE_COUNT` to 5