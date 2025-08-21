import { useState, useEffect, useCallback } from 'react';
import { useIsMobile, useIsTablet, useIsDesktop } from './use-responsive';

interface PanelSizes {
  [panelId: string]: number;
}

interface UseResizablePanelsOptions {
  storageKey: string;
  defaultSizes: PanelSizes;
  minSizes?: PanelSizes;
  maxSizes?: PanelSizes;
}

export const useResizablePanels = ({
  storageKey,
  defaultSizes,
  minSizes = {},
  maxSizes = {}
}: UseResizablePanelsOptions) => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();
  
  // Get device-specific storage key
  const getDeviceStorageKey = useCallback(() => {
    const device = isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop';
    return `${storageKey}-${device}`;
  }, [storageKey, isMobile, isTablet, isDesktop]);

  // Load saved sizes from localStorage
  const loadSavedSizes = useCallback((): PanelSizes => {
    try {
      const saved = localStorage.getItem(getDeviceStorageKey());
      if (saved) {
        const parsedSizes = JSON.parse(saved);
        // Validate that all required panels have sizes
        const hasAllPanels = Object.keys(defaultSizes).every(
          panelId => typeof parsedSizes[panelId] === 'number'
        );
        if (hasAllPanels) {
          return parsedSizes;
        }
      }
    } catch (error) {
      console.warn('Failed to load panel sizes from localStorage:', error);
    }
    return defaultSizes;
  }, [getDeviceStorageKey, defaultSizes]);

  const [panelSizes, setPanelSizes] = useState<PanelSizes>(loadSavedSizes);

  // Save sizes to localStorage when they change
  const savePanelSizes = useCallback((sizes: PanelSizes) => {
    try {
      localStorage.setItem(getDeviceStorageKey(), JSON.stringify(sizes));
      setPanelSizes(sizes);
    } catch (error) {
      console.warn('Failed to save panel sizes to localStorage:', error);
      setPanelSizes(sizes);
    }
  }, [getDeviceStorageKey]);

  // Update individual panel size
  const updatePanelSize = useCallback((panelId: string, size: number) => {
    const minSize = minSizes[panelId] || 0;
    const maxSize = maxSizes[panelId] || 100;
    const clampedSize = Math.max(minSize, Math.min(maxSize, size));
    
    savePanelSizes({
      ...panelSizes,
      [panelId]: clampedSize
    });
  }, [panelSizes, minSizes, maxSizes, savePanelSizes]);

  // Reset to default sizes
  const resetPanelSizes = useCallback(() => {
    try {
      localStorage.removeItem(getDeviceStorageKey());
    } catch (error) {
      console.warn('Failed to clear panel sizes from localStorage:', error);
    }
    setPanelSizes(defaultSizes);
  }, [getDeviceStorageKey, defaultSizes]);

  // Get panel size with fallback
  const getPanelSize = useCallback((panelId: string): number => {
    return panelSizes[panelId] ?? defaultSizes[panelId] ?? 50;
  }, [panelSizes, defaultSizes]);

  // Handle device change - reload sizes for new device
  useEffect(() => {
    const newSizes = loadSavedSizes();
    setPanelSizes(newSizes);
  }, [loadSavedSizes]);

  return {
    panelSizes,
    getPanelSize,
    updatePanelSize,
    resetPanelSizes,
    savePanelSizes
  };
};