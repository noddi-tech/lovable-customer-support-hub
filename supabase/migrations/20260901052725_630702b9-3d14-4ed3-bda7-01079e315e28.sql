DROP TRIGGER IF EXISTS trigger_notify_customer_reply ON public.messages;
DROP TRIGGER IF EXISTS trigger_notify_new_conversation ON public.conversations;
DROP TRIGGER IF EXISTS notify_conversation_assignment_trigger ON public.conversations;