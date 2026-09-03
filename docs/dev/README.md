# Development Documentation

This folder contains day-to-day development guides (debugging probes, logging).

For **initial setup** (clone, `.env`, quality gate, Make targets), see
[`CONTRIBUTING.md`](../../CONTRIBUTING.md) in the repo root.

## Available Guides

- [**Linting & code quality**](./linting.md) - Biome, ESLint, Knip, dependency-cruiser, secrets, Semgrep, jscpd
- [**Debugging Tools**](./debugging.md) - UIProbe, SafeComponents, and diagnostic tools
- [**Logging System**](./logging.md) - Log levels, smart deduplication, and usage guide

## Quick reference

### Debugging UI Issues

```bash
# Enable UIProbe for tab/button overlap detection
VITE_UI_PROBE=1 bun run dev
```

### Controlling Log Verbosity

```bash
# Show all debug logs
VITE_LOG_LEVEL=DEBUG bun run dev

# Show only important logs (default)
VITE_LOG_LEVEL=INFO bun run dev

# Minimal logging
VITE_LOG_LEVEL=WARN bun run dev

# Silent mode
VITE_LOG_LEVEL=SILENT bun run dev
```

## Development Workflow

1. **During Development**: Use `INFO` or `DEBUG` level to see what's happening
2. **Before Commit**: Run `make quality-gate`; prefer `WARN` log level so production stays quiet
3. **For Bug Hunting**: Use `DEBUG` level with UIProbe enabled

## Best Practices

- Always use `logger` instead of `console.log` in new code
- Add component names to log calls for better categorization
- Keep debug logs informative but concise
- Use appropriate log levels (DEBUG for detailed info, INFO for key events)
