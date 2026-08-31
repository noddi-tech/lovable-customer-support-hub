import React from 'react';
import { cn } from '@/lib/utils';
import { getBrandColor, type ConversationBrand } from '@/lib/conversationBrand';

interface BrandBadgeProps {
  brand: ConversationBrand;
  compact?: boolean;
  className?: string;
}

/** Shows which brand / site a live chat or widget conversation originated from. */
export const BrandBadge: React.FC<BrandBadgeProps> = ({ brand, compact, className }) => {
  const color = getBrandColor(brand.key);
  return (
    <span
      title={
        brand.inferred
          ? `Chat started from ${brand.label} (derived from page URL)`
          : `Brand: ${brand.label}`
      }
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-1.5 py-0 max-w-full',
        compact ? 'text-[9px]' : 'text-[10px]',
        className,
      )}
      style={{ borderColor: `${color}66`, backgroundColor: `${color}14`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="truncate font-medium">{brand.label}</span>
    </span>
  );
};
