import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Check, Tag, Ban, ChevronDown } from 'lucide-react';
import { useNoddiBrands } from '@/hooks/useNoddiBrands';
import { useConversationBrandActions } from '@/hooks/useConversationBrandActions';
import { getBrandColor, getConversationBrand } from '@/lib/conversationBrand';
import { BrandBadge } from '@/components/dashboard/conversation-list/BrandBadge';

interface ConversationBrandPickerProps {
  conversationId: string;
  metadata: unknown;
  channel?: string | null;
}

/**
 * Detail-view control letting agents categorise a conversation (email / text /
 * chat) by brand. Shows the current brand badge — logo + brand theme color —
 * and opens the brand catalog from the Noddi backend.
 */
export const ConversationBrandPicker: React.FC<ConversationBrandPickerProps> = ({
  conversationId,
  metadata,
  channel,
}) => {
  const { brands, findBrand } = useNoddiBrands();
  const { setBrand } = useConversationBrandActions();

  const brand = getConversationBrand(metadata, channel);
  const currentSlug = findBrand(brand?.label)?.slug ?? null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-1.5 gap-1 text-xs"
          title="Set brand for this conversation"
        >
          {brand ? (
            <BrandBadge brand={brand} size="md" />
          ) : (
            <span className="inline-flex items-center gap-1 text-muted-foreground">
              <Tag className="h-3.5 w-3.5" />
              Set brand
            </span>
          )}
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56 max-h-80 overflow-y-auto">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Brand</DropdownMenuLabel>
        {brands.length === 0 && (
          <div className="px-3 py-4 text-sm text-muted-foreground">No brands available</div>
        )}
        {brands.map((b) => {
          const color = getBrandColor(b.slug);
          return (
            <DropdownMenuItem key={b.id} className="gap-2" onSelect={() => setBrand(conversationId, b.name)}>
              {b.logo_url ? (
                <img src={b.logo_url} alt="" loading="lazy" className="h-5 w-5 rounded-sm object-contain shrink-0" />
              ) : (
                <span
                  className="h-5 w-5 rounded-sm shrink-0 grid place-items-center text-[10px] font-semibold text-white"
                  style={{ backgroundColor: color }}
                  aria-hidden
                >
                  {b.name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="truncate flex-1" style={{ color }}>{b.name}</span>
              {currentSlug === b.slug && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setBrand(conversationId, null)}>
          <Ban className="w-4 h-4 mr-2" />
          Clear brand
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
