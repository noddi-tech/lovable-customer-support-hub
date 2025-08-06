-- Create trigger for note edit notifications
CREATE TRIGGER send_note_edit_notification_trigger
  AFTER UPDATE ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.send_note_edit_notification();