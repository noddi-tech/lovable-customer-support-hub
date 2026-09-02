# Support Hub documentation

Everything in this folder is rendered inside the app at [`/docs`](/docs) for signed-in users.

## Architecture decisions

Durable decisions live in [`docs/adr/`](./adr/README.md) as numbered Architecture Decision
Records. Start there to understand _why_ the system looks the way it does.

## Guides

### Platform

- [Testing guide](./TESTING_GUIDE.md)
- [Production testing checklist](./PRODUCTION_TESTING_CHECKLIST.md)
- [Audit logging](./AUDIT_LOGGING.md)
- [Scrolling pattern](./scrolling-pattern.md)
- [Layout panes](./layout/panes.md)

### AI and knowledge

- [AI intelligence overview](./AI_INTELLIGENCE_README.md)
- [Knowledge system](./KNOWLEDGE_SYSTEM.md)

### Channels and integrations

- [Widget embed guide](./WIDGET_EMBED_GUIDE.md)
- [Slack alerting system](./SLACK_ALERTING_SYSTEM.md)
- [Aircall integration](./aircall-everywhere-integration.md)
- [Aircall troubleshooting](./aircall-troubleshooting.md)
- [Aircall testing checklist](./aircall-testing-checklist.md)
- [Noddi API endpoints](./NODDI_API_ENDPOINTS.md)
- [Navio SSO setup](./sso/navio-auth-setup.md)

### Product areas

- [Customer segmentation](./customer-segmentation.md)
- [Conversations configuration](./conversations/config.md)
- [Conversations performance notes](./conversations/perf-notes.md)

### Development

- [Contributing / local setup](../CONTRIBUTING.md) — clone, `.env`, quality gate, commands
- [Dev tooling](./dev/README.md)
- [Debugging](./dev/debugging.md)
- [Logging](./dev/logging.md)

## House rules

- One-off reports, phase summaries and "fix applied" write-ups do not belong here. If the
  finding matters, it becomes an ADR; otherwise it is deleted with the pull request.
- Never put secrets, tokens or customer data in this folder — any signed-in user can read it.
