import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export type InlineFieldType = 'text' | 'number' | 'date' | 'select';

export interface InlineSelectOption {
  value: string;
  label: string;
}

interface Props {
  type: InlineFieldType;
  initialValue: string;
  options?: readonly InlineSelectOption[];
  isPending?: boolean;
  onSave: (next: string) => void | Promise<void>;
  onCancel: () => void;
}

const InlineEditField: React.FC<Props> = ({
  type,
  initialValue,
  options,
  isPending,
  onSave,
  onCancel,
}) => {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (type !== 'select') inputRef.current?.focus();
  }, [type]);

  const commit = () => {
    if (value === initialValue) {
      onCancel();
      return;
    }
    void onSave(value);
  };

  if (type === 'select') {
    return (
      <div className="flex items-center gap-2">
        <Select
          value={value}
          onValueChange={(v) => {
            setValue(v);
            // Save immediately on selection change for selects.
            if (v !== initialValue) void onSave(v);
            else onCancel();
          }}
          disabled={isPending}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(options ?? []).map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isPending && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        ref={inputRef}
        type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
        value={value}
        disabled={isPending}
        onChange={(e) => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          } else if (e.key === 'Escape') {
            e.preventDefault();
            onCancel();
          }
        }}
        className="h-8"
      />
      {isPending && (
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Lagrer…
        </span>
      )}
    </div>
  );
};

export default InlineEditField;
