# 1. Record architecture decisions

- Status: Accepted
- Date: 2026-09-02
- Deciders: Support Hub engineering

## Context

Architectural knowledge lived in ad-hoc summary and report markdown files at the repository root. They were written once, never updated, and mixed one-off debugging notes with durable decisions, so nobody could tell what was still true.

## Decision

Record every durable architectural decision as a numbered Architecture Decision Record in `docs/adr/`, following the lightweight ADR format described at https://github.com/architecture-decision-record/architecture-decision-record. One decision per file, immutable once accepted: a decision that changes gets a new ADR that supersedes the old one. Task-specific reports and phase summaries are not documentation and are deleted once the work lands.

## Consequences

- The reasoning behind the system is discoverable and dated.
- Superseded decisions stay readable instead of being silently edited away.
- Writing an ADR is an extra step in any architectural change.
