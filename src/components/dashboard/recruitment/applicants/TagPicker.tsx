import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronDown, X, Tag as TagIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useTags, type RecruitmentTag } from '@/hooks/recruitment/useTags';

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  triggerLabel?: string;
  placeholder?: string;
  showSelected?: boolean;
  className?: string;
  size?: 'default' | 'sm';
}

export function TagPicker({
  value,
  onChange,
  triggerLabel,
  placeholder = 'Søk etter etikett...',
  showSelected = true,
  className,
  size = 'default',
}: Props) {
  const [open, setOpen] = useState(false);
  const { data: tags } = useTags();
  const list = tags ?? [];
  const selectedSet = new Set(value);
  const selected = list.filter((t) => selectedSet.has(t.id));

  const toggle = (id: string) => {
    if (selectedSet.has(id)) onChange(value.filter((v) => v !== id));
    else onChange([...value, id]);
  };

  const clearAll = () => onChange([]);
  const selectAll = () => onChange(list.map((t) => t.id));

  return (
    <div className={cn('space-y-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size={size}
            className="justify-between gap-2"
          >
            <span className="inline-flex items-center gap-2">
              <TagIcon className="h-4 w-4" />
              {triggerLabel ?? (value.length > 0 ? `Etiketter (${value.length})` : 'Etiketter')}
            </span>
            <ChevronDown className="h-4 w-4 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          {list.length === 0 ? (
            <div className="p-4 text-sm text-muted-foreground space-y-2">
              <p>Ingen etiketter ennå. Opprett en i innstillinger.</p>
              <Link
                to="/admin/recruitment?tab=tags"
                className="text-primary hover:underline text-sm inline-block"
                onClick={() => setOpen(false)}
              >
                Gå til etikett-innstillinger →
              </Link>
            </div>
          ) : (
            <Command>
              <CommandInput placeholder={placeholder} />
              <CommandList>
                <CommandEmpty>Ingen treff.</CommandEmpty>
                <CommandGroup>
                  {list.map((t) => (
                    <CommandItem key={t.id} value={t.name} onSelect={() => toggle(t.id)}>
                      <span
                        className="h-3 w-3 rounded-full flex-shrink-0 mr-2"
                        style={{ backgroundColor: t.color }}
                      />
                      <span className="flex-1 truncate">{t.name}</span>
                      {selectedSet.has(t.id) && <Check className="h-4 w-4 text-primary" />}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <div className="border-t p-2 flex gap-2 justify-between text-xs">
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={selectAll}
                  >
                    Velg alle
                  </button>
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={clearAll}
                  >
                    Fjern alle
                  </button>
                </div>
              </CommandList>
            </Command>
          )}
        </PopoverContent>
      </Popover>

      {showSelected && selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((t) => (
            <TagChip key={t.id} tag={t} onRemove={() => toggle(t.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

export function TagChip({
  tag,
  onRemove,
  size = 'default',
}: {
  tag: Pick<RecruitmentTag, 'id' | 'name' | 'color'>;
  onRemove?: () => void;
  size?: 'default' | 'sm';
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-0.5'
      )}
      style={{
        borderColor: tag.color,
        backgroundColor: `${tag.color}1A`,
        color: tag.color,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: tag.color }}
      />
      <span className="truncate max-w-[120px]">{tag.name}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="hover:opacity-70"
          aria-label={`Fjern ${tag.name}`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}
