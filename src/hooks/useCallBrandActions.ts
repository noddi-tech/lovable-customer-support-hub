import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/utils/logger';
import { useEntityBrandActions } from '@/hooks/useEntityBrandActions';

const INVALIDATE_KEYS = ['calls', 'active-calls'];

/**
 * Lets agents categorise a phone call by brand (which business the caller
 * reached out about). The brand name is stored on `calls.metadata.brand`,
 * mirroring `conversations.metadata.brand`, so badges, logos and theme colors
 * resolve exactly the same way across email, chat and voice.
 */
export function useCallBrandActions() {
  // Mirror the brand label onto the call in Aircall as a tag, so the same
  // categorisation is visible to anyone working in the Aircall phone.
  const syncAircallTag = useCallback(async (callId: string, brandName: string | null) => {
    const { data: tagResult, error: tagError } = await supabase.functions.invoke('aircall-tag-call', {
      body: { callId, brandName },
    });
    if (tagError || (tagResult && tagResult.success === false)) {
      logger.warn(
        'Failed to sync call brand tag to Aircall',
        tagError || tagResult,
        'useCallBrandActions',
      );
      toast.warning('Brand saved, but the Aircall tag could not be updated');
    }
  }, []);

  return useEntityBrandActions({
    table: 'calls',
    invalidateKeys: INVALIDATE_KEYS,
    context: 'useCallBrandActions',
    afterSet: syncAircallTag,
  });
}
