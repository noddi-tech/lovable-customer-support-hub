
Root cause is now clearer, and you’re right: the current fix path overreached.

What I verified:
- The reported conversation’s DB rows are normal: real customer emails are still stored as `sender_type=customer`, and real agent replies are stored as `sender_type=agent`.
- There are no `cleanup-forwarding-echoes` logs, so the cleanup script did not run.
- The regression is primarily in frontend normalization/filtering, not this thread’s stored data.

Why it got worse:
1. Multiple UI contexts now hardcode `agentDomains: ['noddi.no']`.
2. `normalizeMessage` can flip email messages to agent/outbound based on domain-level matches plus forwarded-header heuristics.
3. The echo filter was broadened to compare inbound messages against all earlier messages, which is too aggressive.
4. Result: customer/agent attribution can flip incorrectly, while duplicates still survive in some cases.

Plan

1. Revert the unsafe agent-domain shortcut
- Remove the hardcoded `agentDomains: ['noddi.no']` from:
  - `src/hooks/conversations/useThreadMessages.ts`
  - `src/hooks/conversations/useConversationMessages.ts`
  - `src/components/conversations/ProgressiveMessagesList.tsx`
- Stop treating any `@noddi.no` address as an agent by default.
- Keep agent detection based on stronger signals only:
  - `sender_type === 'agent'`
  - joined `sender_profile`
  - explicit known agent email(s)
  - exact current user email
  - exact inbox/public mailbox addresses only where appropriate

2. Tighten `normalizeMessage` so it only flips when proof is explicit
- Update `src/lib/normalizeMessage.ts`
- Keep forwarded-copy detection, but only reclassify a `sender_type='customer'` email to agent/outbound when explicit headers prove it:
  - `Reply-To`
  - `X-Original-From`
  - `X-Google-Original-From`
- Do not use broad org-domain matching as proof for email reclassification.
- Do not let generic `From`/`Sender` group addresses or `via` text alone flip author type.
- Preserve real customer attribution even when messages route through Google Groups.

3. Roll back the overly broad echo filter
- Update `src/hooks/conversations/useThreadMessagesList.ts`
- Remove the current “match any inbound against any earlier message” behavior.
- Replace it with a narrow rule:
  - only consider email messages
  - only consider rows still normalized as inbound/customer
  - only filter when forwarding/list metadata is present
  - only compare against earlier agent/outbound messages
  - require a substantial body match
- This avoids hiding legitimate customer follow-ups that quote earlier emails.

4. Pause destructive cleanup logic until detection is safe
- Update `supabase/functions/cleanup-forwarding-echoes/index.ts`
- Change it from broad delete-by-substring logic to strict dry-run auditing first.
- Only report candidates when:
  - headers indicate list/group forwarding
  - candidate is inbound/customer
  - earlier matched message is agent/outbound
- No broad customer-vs-earlier-message matching.

5. Prevent future bad inserts at ingestion time
- Update `supabase/functions/sendgrid-inbound/index.ts`
- Strengthen inbound handling for Google Groups copies:
  - if the resolved real author is clearly an agent/mailbox-side sender, flag or skip storing it as a customer inbound
  - keep loop prevention, but add a second forwarding-echo guard for rewritten Message-IDs
- Goal: stop new bad rows before they hit the UI.

6. Add regression coverage for the exact failure mode
- Expand tests around:
  - real customer mail through Google Groups stays customer/inbound
  - agent forwarded copy only flips when explicit original-author headers prove it
  - inbound customer reply quoting earlier content is not filtered
  - forwarded agent duplicate with list headers is filtered/audited correctly

Files to update
- `src/lib/normalizeMessage.ts`
- `src/hooks/conversations/useThreadMessagesList.ts`
- `src/hooks/conversations/useThreadMessages.ts`
- `src/hooks/conversations/useConversationMessages.ts`
- `src/components/conversations/ProgressiveMessagesList.tsx`
- `supabase/functions/sendgrid-inbound/index.ts`
- `supabase/functions/cleanup-forwarding-echoes/index.ts`
- forwarding-related tests

Technical detail
```text
Current bad behavior:
hardcoded org domain => agent guess
+ broad header override
+ broad inbound-vs-earlier substring filter
=> customer/agent mixups
=> duplicates still not handled safely

Target behavior:
exact author proof only
+ narrow forwarded-copy detection
+ no destructive cleanup without strict forwarding evidence
=> customer messages stay customer
=> real agent copies stop showing as fake customer inbound
=> safer historical audit before deletion
```
