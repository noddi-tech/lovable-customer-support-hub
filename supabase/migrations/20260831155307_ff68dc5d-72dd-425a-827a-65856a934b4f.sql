ALTER TABLE public.widget_chat_sessions ADD COLUMN IF NOT EXISTS case_id uuid REFERENCES public.cases(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_widget_chat_sessions_case_id ON public.widget_chat_sessions(case_id);
CREATE INDEX IF NOT EXISTS idx_conversations_case_id ON public.conversations(case_id);
CREATE INDEX IF NOT EXISTS idx_calls_case_id ON public.calls(case_id);
CREATE INDEX IF NOT EXISTS idx_cases_customer_id ON public.cases(customer_id);