# 17. Documentation is rendered inside the app at /docs

- Status: Accepted
- Date: 2026-09-02
- Deciders: Support Hub engineering

## Context

Markdown in the repository is only read by whoever is already in the editor. Operators and admins never see it, and stale files were impossible to spot.

## Decision

Bundle every markdown file under `docs/` at build time and render it at `/docs` behind authentication, with a browsable sidebar, search and anchored headings. The repository stays the single source of truth: there is no separate documentation database or CMS.

## Consequences

- Documentation is one click away from the product it describes and inherits the app's access control.
- Docs ship with the bundle, so a documentation fix requires a deploy.
- Nothing secret may be written into `docs/`, because any signed-in user can read it.
