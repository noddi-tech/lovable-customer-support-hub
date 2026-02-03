-- Fix the stuck extraction job that completed processing but wasn't marked as completed
UPDATE knowledge_extraction_jobs 
SET status = 'completed', completed_at = NOW() 
WHERE id = '25bceb08-9996-41ed-9562-aaa52e70c405' 
  AND status = 'running';