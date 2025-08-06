-- Create the missing trigger for note edit notifications
CREATE TRIGGER trigger_send_note_edit_notification
AFTER UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.send_note_edit_notification();

-- Also enable real-time for notifications table
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;