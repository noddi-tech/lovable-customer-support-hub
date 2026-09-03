-- AI widget chat: human escalation + takeover lifecycle.
--
-- The AI chat lives in its own tables (widget_ai_conversations / widget_ai_messages),
-- separate from live chat (conversations / widget_chat_sessions / messages). To let a
-- customer ask for a human while the AI keeps answering — and to let a human take over
-- that same thread when they are ready — we track assignment + typing on the AI
-- conversation and allow agent-authored messages on the AI message table.
--
-- Conversation status lifecycle:
--   active     -> AI is handling the chat (default)
--   escalated  -> customer requested a human; AI still answers; awaiting a claim
--   assigned   -> a human took over; AI is paused
--   resolved   -> issue solved (by AI or human)
--   ended      -> closed / abandoned

alter table public.widget_ai_conversations
  add column if not exists assigned_agent_id uuid references public.profiles(id) on delete set null,
  add column if not exists assigned_at timestamptz,
  add column if not exists visitor_name text,
  add column if not exists agent_typing boolean not null default false,
  -- Capability binding: the widget-facing control actions (escalate/resolve/poll)
  -- are gated on a per-conversation secret. The widget key is public and the
  -- conversation id is a bearer-style UUID, so without this any visitor could
  -- read another visitor's agent replies (poll) or escalate/resolve their chat
  -- (IDOR). We store only the SHA-256 hash of the visitor's token here.
  add column if not exists visitor_token_hash text;

-- Agent replies are written into the AI thread with role = 'agent'; attribute them.
alter table public.widget_ai_messages
  add column if not exists agent_id uuid references public.profiles(id) on delete set null;

-- Inbox + escalation-alert queries filter AI conversations by org + status + recency.
create index if not exists idx_widget_ai_conversations_org_status
  on public.widget_ai_conversations (organization_id, status, updated_at desc);

create index if not exists idx_widget_ai_conversations_assigned_agent
  on public.widget_ai_conversations (assigned_agent_id)
  where assigned_agent_id is not null;

-- Support hub subscribes to escalations in realtime (new "needs a human" alerts)
-- and polls agent replies; publish the AI tables and keep old-row images so
-- status transitions (active -> escalated -> assigned) are observable.
alter table public.widget_ai_conversations replica identity full;
alter table public.widget_ai_messages replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.widget_ai_conversations;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.widget_ai_messages;
  exception when duplicate_object then null;
  end;
end $$;
