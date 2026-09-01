import React from 'react';
import { useCallBrandActions } from '@/hooks/useCallBrandActions';
import { BrandPickerButton } from '@/components/brands/BrandPickerButton';

interface CallBrandPickerProps {
  callId: string;
  metadata: unknown;
  className?: string;
}

/** Detail / active-call control to assign the brand a call belonged to. */
export const CallBrandPicker: React.FC<CallBrandPickerProps> = ({ callId, metadata, className }) => {
  const { setBrand } = useCallBrandActions();

  return (
    <BrandPickerButton
      metadata={metadata}
      channel="voice"
      className={className}
      title="Set the brand this call belonged to"
      stopPropagation
      onSelect={(brandName) => setBrand(callId, brandName)}
    />
  );
};
