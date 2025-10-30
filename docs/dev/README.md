# Development Documentation

This folder contains development documentation for the project.

## Available Guides

- [**Debugging Tools**](./debugging.md) - UIProbe, SafeComponents, and diagnostic tools
- [**Logging System**](./logging.md) - Log levels, smart deduplication, and usage guide

## Quick Start

### Debugging UI Issues

```bash
# Enable UIProbe for tab/button overlap detection
VITE_UI_PROBE=1 npm run dev
```

### Controlling Log Verbosity

```bash
# Show all debug logs
VITE_LOG_LEVEL=DEBUG npm run dev

# Show only important logs (default)
VITE_LOG_LEVEL=INFO npm run dev

# Minimal logging
VITE_LOG_LEVEL=WARN npm run dev

# Silent mode
VITE_LOG_LEVEL=SILENT npm run dev
```

## Development Workflow

1. **During Development**: Use `INFO` or `DEBUG` level to see what's happening
2. **Before Commit**: Test with `WARN` level to ensure production won't be noisy
3. **For Bug Hunting**: Use `DEBUG` level with UIProbe enabled

## Best Practices

- Always use `logger` instead of `console.log` in new code
- Add component names to log calls for better categorization
- Keep debug logs informative but concise
- Use appropriate log levels (DEBUG for detailed info, INFO for key events)
