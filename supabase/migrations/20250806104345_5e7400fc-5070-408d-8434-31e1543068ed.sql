-- Create a test function to manually create notifications for testing
CREATE OR REPLACE FUNCTION public.create_test_notification()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    type,
    data
  ) VALUES (
    auth.uid(),
    'Test Notification',
    'This is a test notification to verify real-time updates are working',
    'info',
    jsonb_build_object('test', true)
  );
END;
$function$;