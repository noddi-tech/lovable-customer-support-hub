import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getBrandColor } from '@/lib/conversationBrand';
import { useNoddiBrands } from '@/hooks/useNoddiBrands';
import { cn } from '@/lib/utils';

export interface BrandFilterOption {
  key: string;
  label: string;
}

interface BrandFilterSelectProps {
  value: string;
  onChange: (value: string) => void;
  /** Brands present in the currently loaded conversations. */
  options: BrandFilterOption[];
  className?: string;
  triggerClassName?: string;
}

/**
 * Brand filter used by the conversation list and the live-chat list, so both
 * views filter on the brand shown in their badges. Logos come from the Noddi
 * brand catalog; brands without a logo fall back to a colored dot.
 */
export const BrandFilterSelect: React.FC<BrandFilterSelectProps> = ({
  value,
  onChange,
  options,
  triggerClassName,
}) => {
  const { findBrand } = useNoddiBrands();

  const renderOption = (opt: BrandFilterOption) => {
    const logo = findBrand(opt.label)?.logo_url ?? null;
    return (
      <span className="flex items-center gap-2">
        {logo ? (
          <img src={logo} alt="" loading="lazy" className="h-4 w-4 rounded-sm object-contain shrink-0" />
        ) : (
          <span
            className="h-2 w-2 rounded-full shrink-0"
            style={{ backgroundColor: getBrandColor(opt.key) }}
          />
        )}
        <span className="truncate">{opt.label}</span>
      </span>
    );
  };

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={cn('w-auto gap-1', triggerClassName)}>
        <SelectValue placeholder="All brands" />
      </SelectTrigger>
      <SelectContent align="end" className="bg-popover z-50 max-h-72">
        <SelectItem value="all">All brands</SelectItem>
        {options.map((opt) => (
          <SelectItem key={opt.key} value={opt.key}>
            {renderOption(opt)}
          </SelectItem>
        ))}
        <SelectItem value="unknown">No brand</SelectItem>
      </SelectContent>
    </Select>
  );
};
