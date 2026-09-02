# 6. Email threading as a matching cascade

- Status: Accepted
- Date: 2026-09-02
- Deciders: Support Hub engineering

## Context

Customers reply from clients that rewrite or drop headers, forward through Google Groups, or start a new message about an old case. A single header lookup split one case into many conversations.

## Decision

Match inbound mail with a defense-in-depth cascade, in order: `References` root, `In-Reply-To`, the app's own outbound `Message-ID` records, provider thread id, then a scoped subject plus participant heuristic. Inbound messages whose `Message-ID` already exists are discarded as loop echoes. Notification mail (mentions) deliberately generates a fresh `Message-ID` so it never threads into a customer conversation.

## Consequences

- Replies land on the original thread even when headers are lossy.
- The last heuristic step can, rarely, merge two unrelated threads with the same subject and participants.
- Every step is a cheap indexed lookup, so the parser stays fast.
