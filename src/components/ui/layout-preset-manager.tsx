import React, { useState } from 'react';
import { Button } from './button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './dialog';
import { Input } from './input';
import { Label } from './label';
import { Textarea } from './textarea';
import { ScrollArea } from './scroll-area';
import { Badge } from './badge';
import { Separator } from './separator';
import { 
  LayoutTemplate, 
  Plus, 
  Trash2, 
  Check, 
  Settings,
  Star,
  Crown
} from 'lucide-react';
import { LayoutPreset, useLayoutPresets } from '@/hooks/useLayoutPresets';
import { cn } from '@/lib/utils';

interface LayoutPresetManagerProps {
  storageKey: string;
  currentSizes: { [panelId: string]: number };
  onApplyPreset: (sizes: { [panelId: string]: number }) => void;
  className?: string;
}

export const LayoutPresetManager: React.FC<LayoutPresetManagerProps> = ({
  storageKey,
  currentSizes,
  onApplyPreset,
  className
}) => {
  const {
    presets,
    activePresetId,
    applyPreset,
    createPreset,
    deletePreset,
    builtInPresets,
    customPresets
  } = useLayoutPresets({ storageKey, onApplyPreset });

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDescription, setNewPresetDescription] = useState('');

  const handleCreatePreset = () => {
    if (!newPresetName.trim()) return;
    
    createPreset(newPresetName.trim(), newPresetDescription.trim(), currentSizes);
    setNewPresetName('');
    setNewPresetDescription('');
    setIsCreateDialogOpen(false);
  };

  const formatSizes = (sizes: { [panelId: string]: number }) => {
    return Object.entries(sizes)
      .map(([key, value]) => `${key}: ${value}%`)
      .join(', ');
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn("gap-2", className)}
          title="Layout Presets"
        >
          <LayoutTemplate className="h-4 w-4" />
          <span className="hidden sm:inline">Layouts</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5" />
            Layout Presets
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Quick Apply Buttons */}
          <div className="flex flex-wrap gap-2">
            {builtInPresets.slice(0, 4).map((preset) => (
              <Button
                key={preset.id}
                variant={activePresetId === preset.id ? "default" : "outline"}
                size="sm"
                onClick={() => applyPreset(preset.id)}
                className="gap-1"
              >
                {activePresetId === preset.id && <Check className="h-3 w-3" />}
                {preset.name}
              </Button>
            ))}
          </div>

          <Separator />

          <ScrollArea className="max-h-96">
            <div className="space-y-4">
              {/* Built-in Presets */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Crown className="h-4 w-4 text-primary" />
                  <h4 className="font-medium">Built-in Presets</h4>
                </div>
                
                <div className="grid gap-2">
                  {builtInPresets.map((preset) => (
                    <PresetCard
                      key={preset.id}
                      preset={preset}
                      isActive={activePresetId === preset.id}
                      onApply={() => applyPreset(preset.id)}
                      onDelete={undefined}
                    />
                  ))}
                </div>
              </div>

              {/* Custom Presets */}
              {customPresets.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="h-4 w-4 text-muted-foreground" />
                    <h4 className="font-medium">Custom Presets</h4>
                  </div>
                  
                  <div className="grid gap-2">
                    {customPresets.map((preset) => (
                      <PresetCard
                        key={preset.id}
                        preset={preset}
                        isActive={activePresetId === preset.id}
                        onApply={() => applyPreset(preset.id)}
                        onDelete={() => deletePreset(preset.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Create New Preset */}
          <Separator />
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Create Custom Preset
              </Button>
            </DialogTrigger>
            
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Layout Preset</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="preset-name">Name</Label>
                  <Input
                    id="preset-name"
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="My Custom Layout"
                  />
                </div>
                
                <div>
                  <Label htmlFor="preset-description">Description (optional)</Label>
                  <Textarea
                    id="preset-description"
                    value={newPresetDescription}
                    onChange={(e) => setNewPresetDescription(e.target.value)}
                    placeholder="Perfect for reviewing customer details..."
                    rows={2}
                  />
                </div>
                
                <div>
                  <Label>Current Layout</Label>
                  <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                    {formatSizes(currentSizes)}
                  </div>
                </div>
                
                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreatePreset}
                    disabled={!newPresetName.trim()}
                  >
                    Create Preset
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </DialogContent>
    </Dialog>
  );
};

interface PresetCardProps {
  preset: LayoutPreset;
  isActive: boolean;
  onApply: () => void;
  onDelete?: () => void;
}

const PresetCard: React.FC<PresetCardProps> = ({
  preset,
  isActive,
  onApply,
  onDelete
}) => {
  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-lg border",
      isActive && "border-primary bg-primary/5"
    )}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium">{preset.name}</span>
          {preset.isBuiltIn && (
            <Badge variant="secondary" className="text-xs">
              Built-in
            </Badge>
          )}
          {isActive && (
            <Badge variant="default" className="text-xs">
              Active
            </Badge>
          )}
        </div>
        
        {preset.description && (
          <p className="text-sm text-muted-foreground mt-1">
            {preset.description}
          </p>
        )}
        
        <div className="text-xs text-muted-foreground mt-1">
          {Object.entries(preset.sizes)
            .map(([key, value]) => `${key}: ${value}%`)
            .join(', ')}
        </div>
      </div>
      
      <div className="flex items-center gap-1 ml-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onApply}
          className="gap-1"
        >
          {isActive ? <Check className="h-3 w-3" /> : <Settings className="h-3 w-3" />}
          Apply
        </Button>
        
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};