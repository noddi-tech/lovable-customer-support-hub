import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Braces, ChevronDown } from 'lucide-react';
import { MERGE_FIELDS } from './mergeFields';

interface Props {
  onInsert: (key: string) => void;
  size?: 'sm' | 'xs' | 'default';
  label?: string;
}

export function MergeFieldDropdown({ onInsert, size = 'sm', label = 'Sett inn flettefelt' }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size={size}
          aria-label="Sett inn flettefelt"
        >
          <Braces />
          {label}
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Tilgjengelige flettefelt</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {MERGE_FIELDS.map((f) => (
          <DropdownMenuItem
            key={f.key}
            onSelect={() => onInsert(f.key)}
            className="flex flex-col items-start gap-0.5"
          >
            <code className="text-xs font-mono text-primary">{f.key}</code>
            <span className="text-xs text-muted-foreground">{f.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
