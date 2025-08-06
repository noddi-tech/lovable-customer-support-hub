-- Add trigger to clean up notifications when messages are deleted
CREATE OR REPLACE FUNCTION public.cleanup_notifications_on_message_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Delete notifications related to the deleted message
  DELETE FROM public.notifications 
  WHERE data->>'message_id' = OLD.id::text;
  
  RAISE LOG 'Cleaned up notifications for deleted message: %', OLD.id;
  
  RETURN OLD;
END;
$function$;

-- Create trigger to clean up notifications when messages are deleted
DROP TRIGGER IF EXISTS trigger_cleanup_notifications_on_message_delete ON public.messages;
CREATE TRIGGER trigger_cleanup_notifications_on_message_delete
AFTER DELETE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.cleanup_notifications_on_message_delete();