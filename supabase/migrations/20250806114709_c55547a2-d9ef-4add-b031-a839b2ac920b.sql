-- Test our trigger function by manually updating a message to see if it creates notifications
UPDATE public.messages 
SET content = content || ' (test update)' 
WHERE id = 'c8d01fe5-34d4-407c-81eb-ce4b5850b1f6';