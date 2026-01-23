import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { FileText, ArrowUpCircle, Star, Phone, Clock, Calendar, Wrench, StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NoteTemplate {
  id: string;
  name: string;
  content: string;
  icon: string;
  color: string;
  shortcut?: string;
}

interface NoteTemplateSelectorProps {
  onSelectTemplate: (content: string, templateId: string) => void;
  disabled?: boolean;
}

// Map icon names to Lucide components
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'sticky-note': StickyNote,
  'arrow-up-circle': ArrowUpCircle,
  'star': Star,
  'phone': Phone,
  'clock': Clock,
  'calendar': Calendar,
  'wrench': Wrench,
};

// Map color names to Tailwind classes
const colorMap: Record<string, string> = {
  'yellow': 'text-yellow-600 bg-yellow-100',
  'red': 'text-red-600 bg-red-100',
  'gold': 'text-amber-600 bg-amber-100',
  'blue': 'text-blue-600 bg-blue-100',
  'gray': 'text-gray-600 bg-gray-100',
  'purple': 'text-purple-600 bg-purple-100',
  'orange': 'text-orange-600 bg-orange-100',
};

export const NoteTemplateSelector = ({ onSelectTemplate, disabled }: NoteTemplateSelectorProps) => {
  const [open, setOpen] = useState(false);
  const { profile } = useAuth();

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['note-templates', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return [];
      
      const { data, error } = await supabase
        .from('note_templates')
        .select('id, name, content, icon, color, shortcut')
        .eq('organization_id', profile.organization_id)
        .order('name');

      if (error) throw error;
      return data as NoteTemplate[];
    },
    enabled: !!profile?.organization_id,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  const handleSelect = (template: NoteTemplate) => {
    onSelectTemplate(template.content, template.id);
    setOpen(false);
  };

  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || FileText;
    return IconComponent;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled || isLoading}
          className="gap-2"
          title="Insert note template"
        >
          <FileText className="h-4 w-4" />
          <span className="text-xs hidden sm:inline">Templates</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search templates..." />
          <CommandList>
            <CommandEmpty>No templates found.</CommandEmpty>
            <CommandGroup heading="Note Templates">
              {templates.map((template) => {
                const Icon = getIcon(template.icon);
                const colorClass = colorMap[template.color] || colorMap.yellow;
                
                return (
                  <CommandItem
                    key={template.id}
                    value={template.name}
                    onSelect={() => handleSelect(template)}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <div className={cn('p-1.5 rounded', colorClass)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">{template.name}</span>
                      {template.shortcut && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          /{template.shortcut}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
