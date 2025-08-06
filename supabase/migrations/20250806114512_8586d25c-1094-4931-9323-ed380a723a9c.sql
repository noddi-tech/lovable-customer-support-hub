-- Check and remove old triggers that might be conflicting
DROP TRIGGER IF EXISTS trigger_send_assignment_notification ON public.messages;

-- Ensure our comprehensive trigger is the only one active
DROP TRIGGER IF EXISTS trigger_send_note_edit_notification ON public.messages;
CREATE TRIGGER trigger_send_note_edit_notification
AFTER UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.send_note_edit_notification();