import React from 'react';
import { cn } from '@/lib/utils';
import { getBrandColor, type ConversationBrand } from '@/lib/conversationBrand';
import { useNoddiBrands } from '@/hooks/useNoddiBrands';

interface BrandBadgeProps {
  brand: ConversationBrand;
  compact?: boolean;
  /** Larger presentation used in the conversation header. */
  size?: 'sm' | 'md';
  className?: string;
}

/** Shows which brand / site a live chat or widget conversation originated from. */
export const BrandBadge: React.FC<BrandBadgeProps> = ({ brand, compact, size = 'sm', className }) => {
  const { findBrand } = useNoddiBrands();
  const match = findBrand(brand.label);
  const label = match?.name ?? brand.label;
  const color = match?.color_primary || getBrandColor(match?.slug ?? brand.key);
  const logo = match?.logo_url ?? null;

  const dot = size === 'md' ? 'h-2 w-2' : 'h-1.5 w-1.5';
  const logoSize = size === 'md' ? 'h-4 w-4' : compact ? 'h-2.5 w-2.5' : 'h-3 w-3';

  return (
    <span
      title={
        brand.inferred && !match
          ? `Chat started from ${label} (derived from page URL)`
          : `Brand: ${label}`
      }
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-1.5 py-0 max-w-full',
        size === 'md' ? 'text-xs px-2 py-0.5 gap-1.5' : compact ? 'text-[9px]' : 'text-[10px]',
        className,
      )}
      style={{ borderColor: `${color}66`, backgroundColor: `${color}14`, color }}
    >
      {logo ? (
        <img
          src={logo}
          alt=""
          loading="lazy"
          className={cn(logoSize, 'shrink-0 rounded-sm object-contain')}
        />
      ) : (
        <span className={cn(dot, 'rounded-full shrink-0')} style={{ backgroundColor: color }} />
      )}
      <span className="truncate font-medium">{label}</span>
    </span>
  );
};
