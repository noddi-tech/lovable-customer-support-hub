import React from 'react';
import { Ban, Check } from 'lucide-react';
import { useNoddiBrands } from '@/hooks/useNoddiBrands';
import {
  useBrandSearch,
  BrandSearchInput,
  BrandOptionContent,
} from '@/components/dashboard/conversation-list/BrandSearch';

interface MenuItemProps {
  className?: string;
  onSelect?: (event: Event) => void;
  children?: React.ReactNode;
}

interface BrandMenuOptionsProps {
  /** Current brand label stored on the entity metadata, used for the checkmark. */
  currentLabel?: string | null;
  onSelect: (brandName: string | null) => void;
  /** Menu primitives so the same list works inside dropdown and context menus. */
  Item: React.ComponentType<MenuItemProps>;
  Separator: React.ComponentType<Record<string, unknown>>;
}

/**
 * Searchable brand list + "Clear brand" action shared by every brand picker
 * (call rows, conversation rows, detail views), so the catalog, filtering and
 * option rendering only exist once.
 */
export const BrandMenuOptions: React.FC<BrandMenuOptionsProps> = ({
  currentLabel,
  onSelect,
  Item,
  Separator,
}) => {
  const { brands, findBrand } = useNoddiBrands();
  const { search, setSearch, filtered } = useBrandSearch(brands);
  const currentSlug = findBrand(currentLabel)?.slug ?? null;

  return (
    <>
      <BrandSearchInput value={search} onChange={setSearch} />
      {filtered.length === 0 && (
        <div className="px-3 py-4 text-sm text-muted-foreground">No brands found</div>
      )}
      {filtered.map((b) => (
        <Item key={b.id} className="gap-2" onSelect={() => onSelect(b.name)}>
          <BrandOptionContent brand={b} />
          {currentSlug === b.slug && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
        </Item>
      ))}
      <Separator />
      <Item onSelect={() => onSelect(null)}>
        <Ban className="w-4 h-4 mr-2" />
        Clear brand
      </Item>
    </>
  );
};
