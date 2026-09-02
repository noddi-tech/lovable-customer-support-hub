# Support Hub

Support Hub is Noddi’s customer support and operations workspace. It unifies
email, live chat, and voice conversations with marketing campaigns, service
tickets, and analytics in one multi-tenant app for support agents and admins.

**Key capabilities:**

- **Inbox** — Email, live chat, and voice conversations in one workspace
- **Customers** — Customer records, notes, and cross-channel history
- **Marketing** — Campaigns and bulk outreach
- **Operations** — Service tickets and operational analytics
- **Admin** — Organizations, roles, integrations, knowledge, and audit logs
- **Embeddable widget** — Live-chat widget for partner sites

**Architecture highlights:**

- ✅ **Vite + React + TypeScript** frontend
- ✅ **Supabase** for Auth, Postgres, Realtime, and Edge Functions
- ✅ **Navio SSO** for product identity and org scope
- ✅ **Quality gate** on every commit/push (Biome, ESLint, UI guards)
- ✅ **In-app docs** at `/docs` from the `docs/` tree

---

## Quick Start

👋 **First time here?** Check out [`CONTRIBUTING.md`](./CONTRIBUTING.md) for
detailed setup instructions.

```bash
make setup            # Install deps + create .env from .env.example
# Fill in Supabase values in .env (ask another developer)
make dev              # Vite on http://localhost:5173
make quality-gate     # Autofix + verify before commit/push
make test             # Unit tests
```

---

## Documentation

**In the product:**

- 📖 Signed-in users can browse the same guides at [`/docs`](https://support.noddi.co/docs)

**Essential resources:**

- 👨‍💻 **New developers:** [CONTRIBUTING.md](./CONTRIBUTING.md)
- 🤖 **Coding agents:** [AGENTS.md](./AGENTS.md)
- 📚 **Docs index:** [docs/README.md](./docs/README.md)
- 📐 **Architecture decisions:** [docs/adr/](./docs/adr/README.md)
- 🧪 **Testing:** [docs/TESTING_GUIDE.md](./docs/TESTING_GUIDE.md)
- 🛠️ **Dev tooling:** [docs/dev/](./docs/dev/README.md)

**Developer guides:**

- [Debugging](./docs/dev/debugging.md) — UIProbe and safe layout components
- [Logging](./docs/dev/logging.md) — Log levels and `logger` usage
- [Navio SSO setup](./docs/sso/navio-auth-setup.md) — Auth / OIDC
- [Widget embed](./docs/WIDGET_EMBED_GUIDE.md) — Embedding the chat widget
- [Scrolling pattern](./docs/scrolling-pattern.md) — Pane scroll conventions
- [Layout panes](./docs/layout/panes.md) — Multi-pane layout rules

**Operator / integration guides:**

- [Production testing checklist](./docs/PRODUCTION_TESTING_CHECKLIST.md)
- [Slack alerting](./docs/SLACK_ALERTING_SYSTEM.md)
- [Aircall integration](./docs/aircall-everywhere-integration.md)
- [Aircall troubleshooting](./docs/aircall-troubleshooting.md)
- [Noddi API endpoints](./docs/NODDI_API_ENDPOINTS.md)
- [Audit logging](./docs/AUDIT_LOGGING.md)

---

## Deployment

- **Production:** [https://support.noddi.co](https://support.noddi.co)
- **Lovable project:** [lovable.dev project](https://lovable.dev/projects/85bad663-82f6-4abe-b065-809b79462500)

Frontend builds with Vite (`make build`). Backend logic runs on Supabase
(Postgres, Auth, Realtime, Edge Functions). Publish via Lovable (**Share →
Publish**) or your usual CI/CD path for this repo.

---

## Additional Resources

- 💬 [Slack](https://realnoddi.slack.com) — Team communication
- ☁️ [Google Cloud Console](https://console.cloud.google.com) — GCP project management
- 🎨 [Lovable](https://lovable.dev/projects/85bad663-82f6-4abe-b065-809b79462500) — Visual / prompt editing
- 🔌 [Noddi Backend API](https://github.com/noddi-tech/noddi-backend-api) — Core product API

---

#### Welcome to the Navio codebase — we're glad you're here 💜️
