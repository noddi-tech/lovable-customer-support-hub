-- Delete all data for complete clean slate
-- Order matters due to foreign key constraints

-- Delete service ticket related data
DELETE FROM public.service_ticket_attachments;
DELETE FROM public.service_ticket_comments;
DELETE FROM public.service_ticket_events;
DELETE FROM public.service_tickets;

-- Delete response tracking and outcomes
DELETE FROM public.response_outcomes;
DELETE FROM public.response_tracking;

-- Delete knowledge entries
DELETE FROM public.knowledge_entries;
DELETE FROM public.knowledge_patterns;

-- Delete internal events (references call_events)
DELETE FROM public.internal_events;

-- Delete call related data
DELETE FROM public.call_notes;
DELETE FROM public.call_events;
DELETE FROM public.calls;

-- Delete messages and conversations
DELETE FROM public.messages;
DELETE FROM public.conversations;

-- Delete customers
DELETE FROM public.customers;

-- Clear import jobs
DELETE FROM public.import_jobs;