-- Drop existing trigger and recreate it
DROP TRIGGER IF EXISTS trigger_send_note_edit_notification ON public.messages;

-- Create trigger for note edit notifications
CREATE TRIGGER trigger_send_note_edit_notification
  AFTER UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.send_note_edit_notification();