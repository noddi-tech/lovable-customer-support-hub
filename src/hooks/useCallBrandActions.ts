import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';

/**
 * Lets agents categorise a phone call by brand (which business the caller
 * reached out about). The brand name is stored on `calls.metadata.brand`,
 * mirroring `conversations.metadata.brand`, so badges, logos and theme colors
 * resolve exactly the same way across email, chat and voice.
 */
export function useCallBrandActions() {
  const queryClient = useQueryClient();

  const setBrand = useCallback(
    async (callId: string, brandName: string | null) => {
      try {
        const { data: existing, error: readError } = await supabase
          .from('calls')
          .select('metadata')
          .eq('id', callId)
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
          .from('calls')
          .update({ metadata: metadata as any })
          .eq('id', callId);

        if (error) throw error;

        toast.success(brandName ? `Brand set to ${brandName}` : 'Brand cleared');
        queryClient.invalidateQueries({ queryKey: ['calls'] });
        queryClient.invalidateQueries({ queryKey: ['active-calls'] });

        // Mirror the brand label onto the call in Aircall as a tag, so the same
        // categorisation is visible to anyone working in the Aircall phone.
        const { data: tagResult, error: tagError } = await supabase.functions.invoke(
          'aircall-tag-call',
          { body: { callId, brandName } },
        );
        if (tagError || (tagResult && tagResult.success === false)) {
          logger.warn(
            'Failed to sync call brand tag to Aircall',
            tagError || tagResult,
            'useCallBrandActions',
          );
          toast.warning('Brand saved, but the Aircall tag could not be updated');
        }

      } catch (error) {
        logger.error('Failed to set call brand', error, 'useCallBrandActions');
        toast.error('Failed to set brand');
      }
    },
    [queryClient],
  );

  return { setBrand };
}
