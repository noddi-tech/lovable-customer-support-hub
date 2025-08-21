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
  viewportAware?: boolean;
}

export const useResizablePanels = ({
  storageKey,
  defaultSizes,
  minSizes = {},
  maxSizes = {},
  viewportAware = false
}: UseResizablePanelsOptions) => {
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();
  
  const [viewportWidth, setViewportWidth] = useState(() => 
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );
  
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
   
  // Calculate viewport-aware constraints
  const getViewportAwareConstraints = useCallback(() => {
    if (!viewportAware) return { minSizes, maxSizes };
    
    // Responsive constraint rules based on viewport width
    const constraints = { ...minSizes };
    const maxConstraints = { ...maxSizes };
    
    Object.keys(defaultSizes).forEach(panelId => {
      if (viewportWidth >= 1440) {
        // Large desktop: Max 30% width, min 350px, max 500px absolute
        constraints[panelId] = Math.max(constraints[panelId] || 0, Math.min(25, (350 / viewportWidth) * 100));
        maxConstraints[panelId] = Math.min(maxConstraints[panelId] || 100, Math.min(30, (500 / viewportWidth) * 100));
      } else if (viewportWidth >= 1024) {
        // Desktop: Max 35% width, min 300px
        constraints[panelId] = Math.max(constraints[panelId] || 0, Math.min(25, (300 / viewportWidth) * 100));
        maxConstraints[panelId] = Math.min(maxConstraints[panelId] || 100, 35);
      } else if (viewportWidth >= 768) {
        // Medium tablets: Max 40% width, min 250px
        constraints[panelId] = Math.max(constraints[panelId] || 0, Math.min(30, (250 / viewportWidth) * 100));
        maxConstraints[panelId] = Math.min(maxConstraints[panelId] || 100, 40);
      }
    });
    
    return { minSizes: constraints, maxSizes: maxConstraints };
  }, [viewportAware, viewportWidth, minSizes, maxSizes, defaultSizes]);

  // Viewport resize handler
  useEffect(() => {
    if (!viewportAware) return;
    
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewportAware]);

  // Validate and adjust panel sizes when constraints change
  useEffect(() => {
    if (!viewportAware) return;
    
    const { minSizes: dynamicMin, maxSizes: dynamicMax } = getViewportAwareConstraints();
    let needsUpdate = false;
    const updatedSizes = { ...panelSizes };
    
    Object.keys(panelSizes).forEach(panelId => {
      const currentSize = panelSizes[panelId];
      const minSize = dynamicMin[panelId] || 0;
      const maxSize = dynamicMax[panelId] || 100;
      const clampedSize = Math.max(minSize, Math.min(maxSize, currentSize));
      
      if (clampedSize !== currentSize) {
        updatedSizes[panelId] = clampedSize;
        needsUpdate = true;
      }
    });
    
    if (needsUpdate) {
      setPanelSizes(updatedSizes);
    }
  }, [viewportWidth, viewportAware, getViewportAwareConstraints, panelSizes]);

  // Update individual panel size
  const updatePanelSize = useCallback((panelId: string, size: number) => {
    const { minSizes: dynamicMin, maxSizes: dynamicMax } = getViewportAwareConstraints();
    const minSize = dynamicMin[panelId] || 0;
    const maxSize = dynamicMax[panelId] || 100;
    const clampedSize = Math.max(minSize, Math.min(maxSize, size));
    
    savePanelSizes({
      ...panelSizes,
      [panelId]: clampedSize
    });
  }, [panelSizes, getViewportAwareConstraints, savePanelSizes]);

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
    savePanelSizes,
    viewportConstraints: getViewportAwareConstraints(),
    viewportWidth
  };
};