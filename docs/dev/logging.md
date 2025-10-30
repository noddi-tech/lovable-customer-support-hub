# Logging System

## Overview

The app uses a centralized logging system with intelligent log levels and smart deduplication.

## Log Levels

Set `VITE_LOG_LEVEL` environment variable to control verbosity:

- `SILENT` - No logs (production)
- `ERROR` - Only errors
- `WARN` - Errors and warnings (production default)
- `INFO` - Errors, warnings, and informational messages (development default)
- `DEBUG` - All logs including debug output

### Setting Log Level

```bash
# Development - show all logs
VITE_LOG_LEVEL=DEBUG npm run dev

# Development - show only info and above (default)
VITE_LOG_LEVEL=INFO npm run dev

# Production - show only warnings and errors
VITE_LOG_LEVEL=WARN npm run build

# Silent mode - no logs at all
VITE_LOG_LEVEL=SILENT npm run dev
```

## Usage

```typescript
import { logger } from '@/utils/logger';

// Debug logs (only in DEBUG mode)
logger.debug('Detailed diagnostic info', { data }, 'ComponentName');

// Info logs (INFO mode and above)
logger.info('Operation completed', { result }, 'ComponentName');

// Warnings (WARN mode and above)
logger.warn('Something unexpected', error, 'ComponentName');

// Errors (always shown unless SILENT)
logger.error('Operation failed', error, 'ComponentName');
```

## Smart Deduplication

The logger automatically deduplicates repeated messages:

- If the same message is logged multiple times in a row, it shows "↑ Previous message repeated N more time(s)"
- After 2 seconds of silence, the count is flushed
- Reduces console spam from ~600 logs to ~10

## Log Categories

Common component names used for categorization:

- `Auth` - Authentication and session management
- `Realtime` - Supabase realtime subscriptions
- `i18n` - Internationalization
- `Aircall` - Voice integration
- `ConversationListProvider` - Conversation data fetching
- `Interactions` - User interactions tracking

## Migration from console.log

**Before:**
```typescript
console.log('[MyComponent] Operation started:', data);
console.warn('Something went wrong');
console.error('Failed to fetch', error);
```

**After:**
```typescript
import { logger } from '@/utils/logger';

logger.debug('Operation started', data, 'MyComponent');
logger.warn('Something went wrong', undefined, 'MyComponent');
logger.error('Failed to fetch', error, 'MyComponent');
```

## Benefits

1. **Controlled Verbosity** - Adjust log level without code changes
2. **Clean Console** - Deduplication prevents spam
3. **Organized Output** - Categorized by component
4. **Production Ready** - Automatically quieter in production builds
