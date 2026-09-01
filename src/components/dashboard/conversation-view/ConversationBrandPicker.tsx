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
import { getConversationBrand } from '@/lib/conversationBrand';
import { useBrandSearch, BrandSearchInput, BrandOptionContent } from '@/components/dashboard/conversation-list/BrandSearch';
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

  const { search, setSearch, filtered } = useBrandSearch(brands);
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
      <DropdownMenuContent align="start" className="w-60 max-h-80 overflow-y-auto p-1">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Brand</DropdownMenuLabel>
        <BrandSearchInput value={search} onChange={setSearch} />
        {filtered.length === 0 && (
          <div className="px-3 py-4 text-sm text-muted-foreground">No brands found</div>
        )}
        {filtered.map((b) => (
          <DropdownMenuItem key={b.id} className="gap-2" onSelect={() => setBrand(conversationId, b.name)}>
            <BrandOptionContent brand={b} />
            {currentSlug === b.slug && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setBrand(conversationId, null)}>
          <Ban className="w-4 h-4 mr-2" />
          Clear brand
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
