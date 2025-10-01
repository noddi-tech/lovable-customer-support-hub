import { useContext } from 'react';
import { AircallContext, type AircallContextValue } from '@/contexts/AircallContext';

export type { AircallContextValue as UseAircallPhoneReturn };

/**
 * React hook to consume Aircall context
 * 
 * This hook provides access to the global Aircall SDK state.
 * The SDK is initialized once at the app level via AircallProvider.
 */
export const useAircallPhone = (): AircallContextValue => {
  const context = useContext(AircallContext);
  
  if (!context) {
    throw new Error('useAircallPhone must be used within AircallProvider');
  }
  
  return context;
};
