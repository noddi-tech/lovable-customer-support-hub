import React from 'react';
import { format, parseISO } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

export interface FieldOption {
  value: string;
  label_no?: string;
}

interface Props {
  typeKey: string;
  value: unknown;
  options?: FieldOption[] | null;
  onChange: (next: unknown, raw: string | null) => void;
  /** memory #3: nested popovers/selects must use modal={false} inside a Dialog. */
  insideDialog?: boolean;
  autoFocus?: boolean;
}

/** Renders the correct input for a recruitment custom field type. Designed to
 *  be used both standalone and nested inside a Radix Dialog. When `insideDialog`
 *  is true, Popovers are rendered non-modal so the parent Dialog keeps body
 *  scroll lock + focus trap, and we don't end up with `pointer-events: none`
 *  stuck on body after closing a nested popover. */
export const CustomFieldValueInput: React.FC<Props> = ({
  typeKey,
  value,
  options,
  onChange,
  insideDialog,
  autoFocus,
}) => {
  switch (typeKey) {
    case 'long_text':
      return (
        <Textarea
          autoFocus={autoFocus}
          rows={3}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value, e.target.value)}
        />
      );
    case 'number':
      return (
        <Input
          autoFocus={autoFocus}
          type="number"
          value={value == null ? '' : String(value)}
          onChange={(e) => {
            const v = e.target.value;
            const n = v === '' ? null : Number(v);
            onChange(n, v);
          }}
        />
      );
    case 'boolean': {
      const checked = value === true || value === 'true';
      return (
        <div className="flex items-center gap-2 py-1">
          <Switch checked={checked} onCheckedChange={(c) => onChange(c, c ? 'true' : 'false')} />
          <span className="text-sm text-muted-foreground">{checked ? 'Ja' : 'Nei'}</span>
        </div>
      );
    }
    case 'date':
    case 'datetime': {
      const dateVal = (() => {
        if (!value) return undefined;
        try {
          return typeof value === 'string' ? parseISO(value) : (value as Date);
        } catch {
          return undefined;
        }
      })();
      return (
        <Popover modal={!insideDialog ? undefined : false}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !dateVal && 'text-muted-foreground',
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateVal ? format(dateVal, 'PPP') : <span>Velg dato</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateVal}
              onSelect={(d) => {
                if (!d) return;
                const iso = d.toISOString().slice(0, 10);
                onChange(iso, iso);
              }}
              initialFocus
              className={cn('p-3 pointer-events-auto')}
            />
          </PopoverContent>
        </Popover>
      );
    }
    case 'single_select': {
      const v = (value as string) ?? '';
      return (
        <Select value={v} onValueChange={(val) => onChange(val, val)}>
          <SelectTrigger>
            <SelectValue placeholder="Velg..." />
          </SelectTrigger>
          <SelectContent>
            {(options ?? []).map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label_no || o.value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    }
    case 'multi_select': {
      const arr: string[] = Array.isArray(value) ? (value as string[]) : [];
      const toggle = (val: string) => {
        const next = arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
        onChange(next, next.join(','));
      };
      return (
        <Popover modal={!insideDialog ? undefined : false}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" className="w-full justify-start font-normal">
              {arr.length === 0 ? (
                <span className="text-muted-foreground">Velg...</span>
              ) : (
                <span className="truncate">
                  {arr
                    .map(
                      (v) => (options ?? []).find((o) => o.value === v)?.label_no || v,
                    )
                    .join(', ')}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" align="start">
            <div className="max-h-64 overflow-y-auto space-y-1">
              {(options ?? []).map((o) => {
                const checked = arr.includes(o.value);
                return (
                  <label
                    key={o.value}
                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-accent cursor-pointer text-sm"
                  >
                    <Checkbox checked={checked} onCheckedChange={() => toggle(o.value)} />
                    <span>{o.label_no || o.value}</span>
                  </label>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      );
    }
    case 'email':
    case 'phone':
    case 'url':
    case 'text':
    default:
      return (
        <Input
          autoFocus={autoFocus}
          type={typeKey === 'email' ? 'email' : typeKey === 'url' ? 'url' : 'text'}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value, e.target.value)}
        />
      );
  }
};

export default CustomFieldValueInput;
