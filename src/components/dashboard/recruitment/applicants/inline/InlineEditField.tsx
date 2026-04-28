import React, { useEffect, useRef, useState } from 'react';
import { Check, Loader2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  // Track whether a button is being mouse-pressed so blur doesn't double-handle.
  const suppressBlurRef = useRef(false);

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
    <TooltipProvider delayDuration={150}>
      <div className="flex items-center gap-1">
        <Input
          ref={inputRef}
          type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
          value={value}
          disabled={isPending}
          onChange={(e) => setValue(e.target.value)}
          onBlur={() => {
            if (suppressBlurRef.current) {
              suppressBlurRef.current = false;
              return;
            }
            commit();
          }}
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
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-1" />
        ) : (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onMouseDown={() => {
                    suppressBlurRef.current = true;
                  }}
                  onClick={commit}
                  aria-label="Lagre"
                >
                  <Check className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Lagre</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onMouseDown={() => {
                    suppressBlurRef.current = true;
                  }}
                  onClick={onCancel}
                  aria-label="Avbryt"
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Avbryt</TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </TooltipProvider>
  );
};

export default InlineEditField;
