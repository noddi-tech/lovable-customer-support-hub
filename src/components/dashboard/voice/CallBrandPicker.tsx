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
import { useCallBrandActions } from '@/hooks/useCallBrandActions';
import { getConversationBrand } from '@/lib/conversationBrand';
import {
  useBrandSearch,
  BrandSearchInput,
  BrandOptionContent,
} from '@/components/dashboard/conversation-list/BrandSearch';
import { BrandBadge } from '@/components/dashboard/conversation-list/BrandBadge';

interface CallBrandPickerProps {
  callId: string;
  metadata: unknown;
  className?: string;
}

/** Detail / active-call control to assign the brand a call belonged to. */
export const CallBrandPicker: React.FC<CallBrandPickerProps> = ({ callId, metadata, className }) => {
  const { brands, findBrand } = useNoddiBrands();
  const { setBrand } = useCallBrandActions();
  const { search, setSearch, filtered } = useBrandSearch(brands);

  const brand = getConversationBrand(metadata, 'voice');
  const currentSlug = findBrand(brand?.label)?.slug ?? null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-7 px-1.5 gap-1 text-xs ${className ?? ''}`}
          title="Set the brand this call belonged to"
          onClick={(e) => e.stopPropagation()}
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
      <DropdownMenuContent
        align="start"
        className="w-60 max-h-80 overflow-y-auto p-1"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuLabel className="text-xs text-muted-foreground">Brand</DropdownMenuLabel>
        <BrandSearchInput value={search} onChange={setSearch} />
        {filtered.length === 0 && (
          <div className="px-3 py-4 text-sm text-muted-foreground">No brands found</div>
        )}
        {filtered.map((b) => (
          <DropdownMenuItem key={b.id} className="gap-2" onSelect={() => setBrand(callId, b.name)}>
            <BrandOptionContent brand={b} />
            {currentSlug === b.slug && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setBrand(callId, null)}>
          <Ban className="w-4 h-4 mr-2" />
          Clear brand
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
