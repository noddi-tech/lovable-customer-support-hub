-- Create function to re-link all unlinked calls to existing customers
-- This function will trigger the link_call_to_customer() trigger for each call

CREATE OR REPLACE FUNCTION public.relink_calls_to_customers()
RETURNS TABLE(
  calls_updated integer,
  calls_linked integer,
  execution_time_ms integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  start_time timestamp;
  end_time timestamp;
  updated_count integer;
  linked_count integer;
BEGIN
  start_time := clock_timestamp();
  
  -- Log the start
  RAISE LOG 'Starting re-link of calls to customers...';
  
  -- Update all calls with NULL customer_id that have a customer_phone
  -- This will trigger the link_call_to_customer() trigger
  WITH updated AS (
    UPDATE public.calls
    SET updated_at = NOW()
    WHERE customer_id IS NULL 
      AND customer_phone IS NOT NULL
    RETURNING id
  )
  SELECT COUNT(*) INTO updated_count FROM updated;
  
  -- Count how many calls are now linked after the update
  SELECT COUNT(*) INTO linked_count
  FROM public.calls
  WHERE customer_id IS NOT NULL
    AND updated_at > start_time;
  
  end_time := clock_timestamp();
  
  -- Log the results
  RAISE LOG 'Re-link complete: % calls updated, % calls linked in % ms', 
    updated_count, 
    linked_count,
    EXTRACT(MILLISECONDS FROM (end_time - start_time))::integer;
  
  -- Return results
  RETURN QUERY SELECT 
    updated_count,
    linked_count,
    EXTRACT(MILLISECONDS FROM (end_time - start_time))::integer;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.relink_calls_to_customers() IS 
'Re-links all unlinked calls to existing customers by triggering the link_call_to_customer() trigger. Returns the number of calls updated and linked.';

-- Execute the function immediately to link existing calls
DO $$
DECLARE
  result RECORD;
BEGIN
  -- Run the relink function
  SELECT * INTO result FROM public.relink_calls_to_customers();
  
  RAISE NOTICE '✅ Call re-linking complete: % calls updated, % calls successfully linked in % ms', 
    result.calls_updated,
    result.calls_linked,
    result.execution_time_ms;
END $$;