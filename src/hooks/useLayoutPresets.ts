import { useState, useCallback, useEffect } from 'react';
import { useToast } from './use-toast';

export interface LayoutPreset {
  id: string;
  name: string;
  description: string;
  sizes: { [panelId: string]: number };
  isBuiltIn: boolean;
  createdAt: Date;
}

const BUILT_IN_PRESETS: LayoutPreset[] = [
  {
    id: 'compact',
    name: 'Compact',
    description: 'Narrow sidebar for quick reference',
    sizes: { messages: 80, sidebar: 20 },
    isBuiltIn: true,
    createdAt: new Date()
  },
  {
    id: 'balanced',
    name: 'Balanced',
    description: '70/30 split for standard workflow',
    sizes: { messages: 70, sidebar: 30 },
    isBuiltIn: true,
    createdAt: new Date()
  },
  {
    id: 'focus',
    name: 'Focus',
    description: 'Minimal sidebar, maximum message space',
    sizes: { messages: 85, sidebar: 15 },
    isBuiltIn: true,
    createdAt: new Date()
  },
  {
    id: 'wide-info',
    name: 'Wide Info',
    description: '60/40 split for detailed customer review',
    sizes: { messages: 60, sidebar: 40 },
    isBuiltIn: true,
    createdAt: new Date()
  }
];

interface UseLayoutPresetsOptions {
  storageKey: string;
  onApplyPreset?: (sizes: { [panelId: string]: number }) => void;
}

export const useLayoutPresets = ({ 
  storageKey, 
  onApplyPreset 
}: UseLayoutPresetsOptions) => {
  const { toast } = useToast();
  const [presets, setPresets] = useState<LayoutPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // Load presets from localStorage
  const loadPresets = useCallback(() => {
    try {
      const saved = localStorage.getItem(`${storageKey}-presets`);
      const customPresets = saved ? JSON.parse(saved) : [];
      const allPresets = [...BUILT_IN_PRESETS, ...customPresets];
      setPresets(allPresets);
      
      const activeId = localStorage.getItem(`${storageKey}-active-preset`);
      setActivePresetId(activeId);
    } catch (error) {
      console.warn('Failed to load layout presets:', error);
      setPresets(BUILT_IN_PRESETS);
    }
  }, [storageKey]);

  // Save custom presets to localStorage
  const saveCustomPresets = useCallback((customPresets: LayoutPreset[]) => {
    try {
      localStorage.setItem(`${storageKey}-presets`, JSON.stringify(customPresets));
    } catch (error) {
      console.warn('Failed to save layout presets:', error);
    }
  }, [storageKey]);

  // Apply a preset
  const applyPreset = useCallback((presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (preset && onApplyPreset) {
      onApplyPreset(preset.sizes);
      setActivePresetId(presetId);
      localStorage.setItem(`${storageKey}-active-preset`, presetId);
      
      toast({
        title: "Layout Applied",
        description: `Applied "${preset.name}" layout preset.`
      });
    }
  }, [presets, onApplyPreset, storageKey, toast]);

  // Create custom preset
  const createPreset = useCallback((
    name: string, 
    description: string, 
    sizes: { [panelId: string]: number }
  ) => {
    const newPreset: LayoutPreset = {
      id: `custom-${Date.now()}`,
      name,
      description,
      sizes,
      isBuiltIn: false,
      createdAt: new Date()
    };

    const customPresets = presets.filter(p => !p.isBuiltIn);
    const updatedCustomPresets = [...customPresets, newPreset];
    const allPresets = [...BUILT_IN_PRESETS, ...updatedCustomPresets];
    
    setPresets(allPresets);
    saveCustomPresets(updatedCustomPresets);
    
    toast({
      title: "Preset Created",
      description: `"${name}" preset has been saved.`
    });

    return newPreset.id;
  }, [presets, saveCustomPresets, toast]);

  // Delete custom preset
  const deletePreset = useCallback((presetId: string) => {
    const preset = presets.find(p => p.id === presetId);
    if (!preset || preset.isBuiltIn) return;

    const customPresets = presets.filter(p => !p.isBuiltIn && p.id !== presetId);
    const allPresets = [...BUILT_IN_PRESETS, ...customPresets];
    
    setPresets(allPresets);
    saveCustomPresets(customPresets);
    
    if (activePresetId === presetId) {
      setActivePresetId(null);
      localStorage.removeItem(`${storageKey}-active-preset`);
    }
    
    toast({
      title: "Preset Deleted",
      description: `"${preset.name}" preset has been deleted.`
    });
  }, [presets, activePresetId, storageKey, saveCustomPresets, toast]);

  // Get preset by ID
  const getPreset = useCallback((presetId: string) => {
    return presets.find(p => p.id === presetId);
  }, [presets]);

  // Check if current sizes match a preset
  const findMatchingPreset = useCallback((currentSizes: { [panelId: string]: number }) => {
    return presets.find(preset => {
      const keys = Object.keys(preset.sizes);
      return keys.every(key => {
        const presetSize = preset.sizes[key];
        const currentSize = currentSizes[key];
        return Math.abs(presetSize - currentSize) < 2; // 2% tolerance
      });
    });
  }, [presets]);

  // Update active preset when sizes change
  const updateActivePreset = useCallback((currentSizes: { [panelId: string]: number }) => {
    const matching = findMatchingPreset(currentSizes);
    const newActiveId = matching?.id || null;
    
    if (newActiveId !== activePresetId) {
      setActivePresetId(newActiveId);
      if (newActiveId) {
        localStorage.setItem(`${storageKey}-active-preset`, newActiveId);
      } else {
        localStorage.removeItem(`${storageKey}-active-preset`);
      }
    }
  }, [findMatchingPreset, activePresetId, storageKey]);

  // Initialize presets on mount
  useEffect(() => {
    loadPresets();
  }, [loadPresets]);

  return {
    presets,
    activePresetId,
    applyPreset,
    createPreset,
    deletePreset,
    getPreset,
    updateActivePreset,
    builtInPresets: BUILT_IN_PRESETS,
    customPresets: presets.filter(p => !p.isBuiltIn)
  };
};