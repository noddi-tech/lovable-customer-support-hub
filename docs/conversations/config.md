# Conversation Configuration

## Thread-Aware Messaging

The conversation view implements thread-aware messaging that shows one card per database message, with quoted content automatically hidden for a cleaner experience.

### Key Features

- **One card per DB message**: Each message row from the database renders as a single card
- **Thread-aware loading**: Uses email headers (Message-ID, In-Reply-To, References) to build conversation threads
- **Quoted content hidden**: Quoted email tails are automatically stripped from the display
- **Smart pagination**: "Load older messages" loads actual database rows, not quote segments
- **Proper deduplication**: Messages are deduplicated using stable keys across pages

### Email Threading

The system uses several methods to group related messages:

1. **Email Headers** (primary method):
   - `Message-ID`: Unique identifier for each email
   - `In-Reply-To`: References the Message-ID being replied to
   - `References`: Chain of all previous Message-IDs in the thread

2. **Subject + Participants** (fallback):
   - Normalized subject line (removing Re:, Fwd: prefixes)
   - Matching participants (customer and inbox emails)
   - Time window (90 days by default)

### Configuration

#### Feature Flags

- `VITE_QUOTED_SEGMENTATION=0`: Quoted segmentation is disabled by default
- `VITE_UI_PROBE=1`: Enable debug probes for development

#### Behavior

- **Initial load**: Shows 3 newest messages
- **Pagination**: 20 messages per page after initial load
- **Remaining count**: Based on actual database message count
- **Deduplication**: Uses Message-ID, external_id, or content hash

### Quoted Content Handling

Quoted email content is:
- Automatically detected and stripped from the visible message body
- Not displayed in the UI (no "Show quoted history" toggle)
- Preserved in the database but hidden from users
- Can be re-enabled via feature flag for debugging

### Performance Optimizations

- **Cross-page deduplication**: Prevents duplicate messages when loading older content
- **Stable dedup keys**: Consistent message identification across sessions
- **Efficient threading**: Uses database indexes on email headers and timestamps
- **Smart pagination**: Only loads real messages, not synthetic quote segments

### Development Notes

When `VITE_QUOTED_SEGMENTATION=1` is set, the system will still parse quoted content but will not display it in the UI. This allows for future features while maintaining the clean thread-aware experience.

The thread building logic handles various email client formats:
- Gmail quote blocks
- Outlook original message headers
- Apple Mail citations
- Norwegian email patterns
- Plain text angle-bracket quotes

### Database Schema

The conversation threading relies on these message fields:
- `email_headers`: JSON containing Message-ID, In-Reply-To, References
- `email_subject`: Subject line for fallback threading
- `external_id`: External system message identifier
- `created_at`: Timestamp for pagination and time-based filtering