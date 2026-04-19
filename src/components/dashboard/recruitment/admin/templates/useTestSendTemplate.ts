import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TestSendInput {
  to: string;
  subject: string;
  html: string;
  fromName?: string;
}

export function useTestSendTemplate() {
  return useMutation({
    mutationFn: async (input: TestSendInput): Promise<void> => {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: input.to,
          subject: `[TEST] ${input.subject}`,
          html: input.html,
          from_name: input.fromName || 'Navio Rekruttering (test)',
        },
      });
      if (error) {
        throw new Error(error.message || 'Kunne ikke sende testmail');
      }
      if (data && (data as any).error) {
        throw new Error((data as any).error);
      }
    },
  });
}
