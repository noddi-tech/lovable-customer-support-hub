import React from 'react';
import { useConversationBrandActions } from '@/hooks/useConversationBrandActions';
import { BrandPickerButton } from '@/components/brands/BrandPickerButton';

interface ConversationBrandPickerProps {
  conversationId: string;
  metadata: unknown;
  channel?: string | null;
}

/**
 * Detail-view control letting agents categorise a conversation (email / text /
 * chat) by brand. Shows the current brand badge — logo + brand theme color —
 * and opens the brand catalog from the Noddi backend.
 */
export const ConversationBrandPicker: React.FC<ConversationBrandPickerProps> = ({
  conversationId,
  metadata,
  channel,
}) => {
  const { setBrand } = useConversationBrandActions();

  return (
    <BrandPickerButton
      metadata={metadata}
      channel={channel}
      title="Set brand for this conversation"
      onSelect={(brandName) => setBrand(conversationId, brandName)}
    />
  );
};
