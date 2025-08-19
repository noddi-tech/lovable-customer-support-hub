-- Delete the test call and its associated events
-- First delete call events (they reference the call)
DELETE FROM public.call_events 
WHERE call_id IN (
  SELECT id FROM public.calls 
  WHERE external_id = 'test-call-1755635984902'
);

-- Then delete the test call itself
DELETE FROM public.calls 
WHERE external_id = 'test-call-1755635984902';