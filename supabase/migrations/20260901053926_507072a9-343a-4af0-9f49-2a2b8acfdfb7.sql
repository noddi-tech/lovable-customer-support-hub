ALTER TABLE public.widget_chat_sessions REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.widget_chat_sessions;