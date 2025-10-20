import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Plus, Star, X } from 'lucide-react';
import type { FilterPreset } from '@/types/interactions';

interface SavedFiltersBarProps {
  presets: FilterPreset[];
  activePresetId?: string;
  onPresetSelect: (preset: FilterPreset) => void;
  onPresetSave: (name: string) => void;
  onPresetDelete: (presetId: string) => void;
}

export function SavedFiltersBar({
  presets,
  activePresetId,
  onPresetSelect,
  onPresetSave,
  onPresetDelete,
}: SavedFiltersBarProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  const handleSave = () => {
    if (newPresetName.trim()) {
      onPresetSave(newPresetName.trim());
      setNewPresetName('');
      setIsDialogOpen(false);
    }
  };

  return (
    <div className="flex items-center gap-2 p-3 border-b bg-background overflow-x-auto">
      <Star className="h-4 w-4 text-muted-foreground flex-shrink-0" />
      <span className="text-sm font-medium text-muted-foreground flex-shrink-0">Saved Views:</span>
      
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {presets.map((preset) => (
          <Badge
            key={preset.id}
            variant={activePresetId === preset.id ? 'default' : 'outline'}
            className="cursor-pointer group relative pr-8 flex-shrink-0"
            onClick={() => onPresetSelect(preset)}
          >
            {preset.name}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPresetDelete(preset.id);
              }}
              className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="flex-shrink-0">
            <Plus className="h-4 w-4 mr-1" />
            Save Current View
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Filter Preset</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Input
                placeholder="Enter preset name..."
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={!newPresetName.trim()}>
                Save Preset
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
