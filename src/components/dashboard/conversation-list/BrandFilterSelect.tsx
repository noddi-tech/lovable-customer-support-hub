import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
 * brand catalog; brands without a logo fall back to their initial.
 */
export const BrandFilterSelect: React.FC<BrandFilterSelectProps> = ({
  value,
  onChange,
  options,
  triggerClassName,
}) => {
  const { brands, findBrand } = useNoddiBrands();

  // Show the full Noddi brand catalog, plus any brand present on loaded rows.
  const mergedOptions = React.useMemo(() => {
    const map = new Map<string, BrandFilterOption>();
    brands.forEach((b) => map.set(b.name.toLowerCase(), { key: b.name.toLowerCase(), label: b.name }));
    options.forEach((o) => map.set(o.key, o));
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [brands, options]);

  const renderOption = (opt: BrandFilterOption) => {
    const logo = findBrand(opt.label)?.logo_url ?? null;
    return (
      <span className="flex items-center gap-2">
        {logo ? (
          <img src={logo} alt="" loading="lazy" className="h-4 w-4 rounded-sm object-contain shrink-0" />
        ) : (
          <span
            className="h-4 w-4 rounded-sm shrink-0 grid place-items-center bg-muted text-[9px] font-semibold text-muted-foreground"
            aria-hidden
          >
            {opt.label.charAt(0).toUpperCase()}
          </span>
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
        {mergedOptions.map((opt) => (
          <SelectItem key={opt.key} value={opt.key}>
            {renderOption(opt)}
          </SelectItem>
        ))}
        <SelectItem value="unknown">No brand</SelectItem>
      </SelectContent>
    </Select>
  );
};
