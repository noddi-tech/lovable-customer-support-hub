-- Recreate the missing triggers for note edit notifications

-- First, ensure the set_sender_id_on_update function exists
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

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS trigger_set_sender_before_update ON public.messages;
DROP TRIGGER IF EXISTS trigger_send_note_edit_notification ON public.messages;
DROP TRIGGER IF EXISTS trigger_send_assignment_notification ON public.messages;

-- Create trigger to set sender_id before update
CREATE TRIGGER trigger_set_sender_before_update
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.set_sender_id_on_update();

-- Create trigger for note edit notifications (runs after sender_id is set)
CREATE TRIGGER trigger_send_note_edit_notification
AFTER UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.send_note_edit_notification();

-- Create trigger for assignment notifications (runs after update)
CREATE TRIGGER trigger_send_assignment_notification
AFTER INSERT OR UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.send_assignment_notification();