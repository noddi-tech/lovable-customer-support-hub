-- Complete the fix for note edit notifications by ensuring sender_id is set properly

-- Create a trigger to set sender_id before update operations
CREATE OR REPLACE FUNCTION public.set_sender_id_on_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  -- Set sender_id to current user if it's not already set
  IF NEW.sender_id IS NULL THEN
    NEW.sender_id := auth.uid();
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger to run before update
DROP TRIGGER IF EXISTS trigger_set_sender_before_update ON public.messages;
CREATE TRIGGER trigger_set_sender_before_update
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.set_sender_id_on_update();

-- Recreate the notification trigger to run after the sender_id is set
DROP TRIGGER IF EXISTS trigger_send_note_edit_notification ON public.messages;
CREATE TRIGGER trigger_send_note_edit_notification
AFTER UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.send_note_edit_notification();