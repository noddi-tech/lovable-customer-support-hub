# 13. Slack alerting split from critical triage

- Status: Accepted
- Date: 2026-09-02
- Deciders: Support Hub engineering

## Context

One firehose channel meant genuine emergencies were missed among routine notifications.

## Decision

Standard alerts route per inbox through configured Slack workspace mappings. Critical triage is a separate AI-driven path that classifies emergencies and posts them to their own channel with its own formatting and mute controls, plus scheduled digests summarized by a small model.

## Consequences

- Emergencies stay visible.
- Two paths to configure and to keep in sync with inbox changes.
