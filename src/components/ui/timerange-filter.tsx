import React, { useState } from 'react';
import { Clock, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { subHours, subDays, subWeeks, format } from 'date-fns';

interface TimeRangeFilterProps {
  onTimeRangeChange: (startDate: Date | null) => void;
  presets: Array<{
    id: string;
    label: string;
    hours?: number;
    days?: number;
    weeks?: number;
  }>;
  showCustomInput?: boolean;
  defaultPreset?: string;
}

export const TimeRangeFilter: React.FC<TimeRangeFilterProps> = ({
  onTimeRangeChange,
  presets,
  showCustomInput = true,
  defaultPreset = 'all'
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>(defaultPreset);
  const [customValue, setCustomValue] = useState<string>('');
  const [customUnit, setCustomUnit] = useState<'hours' | 'days'>('hours');
  const [isOpen, setIsOpen] = useState(false);

  // Initialize with default preset on mount
  React.useEffect(() => {
    if (defaultPreset !== 'all') {
      handlePresetChange(defaultPreset);
    }
  }, []);

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId);
    
    if (presetId === 'all') {
      onTimeRangeChange(null);
      return;
    }

    if (presetId === 'custom') {
      return; // Handle custom in separate function
    }

    const preset = presets.find(p => p.id === presetId);
    if (!preset) return;

    const now = new Date();
    let startDate: Date;

    if (preset.hours) {
      startDate = subHours(now, preset.hours);
    } else if (preset.days) {
      startDate = subDays(now, preset.days);
    } else if (preset.weeks) {
      startDate = subWeeks(now, preset.weeks);
    } else {
      return;
    }

    onTimeRangeChange(startDate);
  };

  const handleCustomApply = () => {
    const value = parseInt(customValue);
    if (isNaN(value) || value <= 0) return;

    const now = new Date();
    const startDate = customUnit === 'hours' 
      ? subHours(now, value)
      : subDays(now, value);

    onTimeRangeChange(startDate);
    setIsOpen(false);
  };

  const getSelectedLabel = () => {
    if (selectedPreset === 'all') return 'All Time';
    if (selectedPreset === 'custom' && customValue) {
      return `Last ${customValue} ${customUnit}`;
    }
    
    const preset = presets.find(p => p.id === selectedPreset);
    return preset?.label || 'All Time';
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {getSelectedLabel()}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-medium">Time Range</Label>
          </div>
          
          {/* Preset Options */}
          <div className="space-y-2">
            <Button
              variant={selectedPreset === 'all' ? 'default' : 'ghost'}
              className="w-full justify-start"
              onClick={() => handlePresetChange('all')}
            >
              All Time
            </Button>
            
            {presets.map((preset) => (
              <Button
                key={preset.id}
                variant={selectedPreset === preset.id ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => handlePresetChange(preset.id)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* Custom Input */}
          {showCustomInput && (
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-sm font-medium">Custom Range</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <Input
                    type="number"
                    placeholder="Enter value"
                    value={customValue}
                    onChange={(e) => setCustomValue(e.target.value)}
                    min="1"
                  />
                </div>
                <Select value={customUnit} onValueChange={(value: 'hours' | 'days') => setCustomUnit(value)}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="days">Days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleCustomApply}
                disabled={!customValue || parseInt(customValue) <= 0}
                className="w-full"
              >
                Apply Custom Range
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};