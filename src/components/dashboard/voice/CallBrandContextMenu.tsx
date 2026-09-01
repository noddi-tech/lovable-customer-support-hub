import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Check, Ban } from 'lucide-react';
import { useNoddiBrands } from '@/hooks/useNoddiBrands';
import { useCallBrandActions } from '@/hooks/useCallBrandActions';
import { getConversationBrand } from '@/lib/conversationBrand';
import {
  useBrandSearch,
  BrandSearchInput,
  BrandOptionContent,
} from '@/components/dashboard/conversation-list/BrandSearch';

interface CallBrandContextMenuProps {
  callId: string;
  metadata: unknown;
  children: React.ReactNode;
  asChild?: boolean;
}

/** Right-click a call row to assign the brand the call belonged to. */
export const CallBrandContextMenu: React.FC<CallBrandContextMenuProps> = ({
  callId,
  metadata,
  children,
  asChild = true,
}) => {
  const { brands, findBrand } = useNoddiBrands();
  const { setBrand } = useCallBrandActions();
  const { search, setSearch, filtered } = useBrandSearch(brands);

  const brand = getConversationBrand(metadata, 'voice');
  const currentSlug = findBrand(brand?.label)?.slug ?? null;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild={asChild}>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-60 max-h-80 overflow-y-auto p-1">
        <ContextMenuLabel className="text-xs text-muted-foreground">Assign brand</ContextMenuLabel>
        <BrandSearchInput value={search} onChange={setSearch} />
        {filtered.length === 0 && (
          <div className="px-3 py-4 text-sm text-muted-foreground">No brands found</div>
        )}
        {filtered.map((b) => (
          <ContextMenuItem key={b.id} className="gap-2" onSelect={() => setBrand(callId, b.name)}>
            <BrandOptionContent brand={b} />
            {currentSlug === b.slug && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
          </ContextMenuItem>
        ))}
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => setBrand(callId, null)}>
          <Ban className="w-4 h-4 mr-2" />
          Clear brand
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};
