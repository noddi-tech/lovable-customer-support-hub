import { useState, useEffect } from 'react';
import type { FilterPreset, StatusFilter, AdvancedFilters } from '@/types/interactions';

const STORAGE_KEY = 'conversation_filter_presets';

export function useFilterPresets() {
  const [presets, setPresets] = useState<FilterPreset[]>([]);
  const [activePresetId, setActivePresetId] = useState<string | undefined>();

  // Load presets from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setPresets(parsed);
      } catch (error) {
        console.error('Failed to parse filter presets:', error);
      }
    }
  }, []);

  // Save presets to localStorage whenever they change
  useEffect(() => {
    if (presets.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
    }
  }, [presets]);

  const savePreset = (
    name: string,
    status: StatusFilter,
    inboxId: string,
    advancedFilters: AdvancedFilters
  ) => {
    const newPreset: FilterPreset = {
      id: Date.now().toString(),
      name,
      filters: {
        status: status !== 'all' ? status : undefined,
        inboxId: inboxId !== 'all' ? inboxId : undefined,
        priority: advancedFilters.priority,
        assigneeId: advancedFilters.assigneeId,
        dateFrom: advancedFilters.dateFrom,
        dateTo: advancedFilters.dateTo,
      },
    };
    setPresets((prev) => [...prev, newPreset]);
  };

  const deletePreset = (presetId: string) => {
    setPresets((prev) => prev.filter((p) => p.id !== presetId));
    if (activePresetId === presetId) {
      setActivePresetId(undefined);
    }
  };

  const applyPreset = (preset: FilterPreset) => {
    setActivePresetId(preset.id);
    return preset;
  };

  const clearActivePreset = () => {
    setActivePresetId(undefined);
  };

  return {
    presets,
    activePresetId,
    savePreset,
    deletePreset,
    applyPreset,
    clearActivePreset,
  };
}
