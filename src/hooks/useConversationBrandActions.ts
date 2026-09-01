import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

/**
 * Lets agents categorise incoming email / text conversations by brand.
 *
 * The brand name (matching the Noddi backend brand catalog) is stored on
 * `conversations.metadata.brand`, the same field the widget uses, so every
 * brand badge in the app resolves logo + theme color the same way.
 */
export function useConversationBrandActions() {
  const queryClient = useQueryClient();

  const setBrand = useCallback(
    async (conversationId: string, brandName: string | null) => {
      try {
        const { data: existing, error: readError } = await supabase
          .from('conversations')
          .select('metadata')
          .eq('id', conversationId)
          .maybeSingle();

        if (readError) throw readError;

        const metadata = { ...((existing?.metadata as Record<string, unknown>) || {}) };
        if (brandName) {
          metadata.brand = brandName;
          metadata.brand_source = 'manual';
        } else {
          delete metadata.brand;
          delete metadata.brand_name;
          delete metadata.brand_source;
        }

        const { error } = await supabase
          .from('conversations')
          .update({ metadata: metadata as any })
          .eq('id', conversationId);

        if (error) throw error;

        toast.success(brandName ? `Brand set to ${brandName}` : 'Brand cleared');
        queryClient.invalidateQueries({ queryKey: ['conversations'] });
        queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
        queryClient.invalidateQueries({ queryKey: ['conversation'] });
      } catch (error) {
        logger.error('Failed to set conversation brand', error, 'useConversationBrandActions');
        toast.error('Failed to set brand');
      }
    },
    [queryClient],
  );

  return { setBrand };
}
