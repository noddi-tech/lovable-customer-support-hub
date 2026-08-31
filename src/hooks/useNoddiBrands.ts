import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export interface NoddiBrand {
  id: number;
  name: string;
  slug: string;
  domain: string | null;
  logo_url: string | null;
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/^www\./, '')
    .replace(/\.(no|co|com|se|dk)$/i, '')
    .replace(/[^a-z0-9]+/g, '');

/** Brand catalog from the Noddi backend (names + logos), cached for the session. */
export function useNoddiBrands() {
  const query = useQuery({
    queryKey: ['noddi-brands'],
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    retry: 1,
    queryFn: async (): Promise<NoddiBrand[]> => {
      const { data, error } = await supabase.functions.invoke('noddi-brands', { method: 'GET' });
      if (error) {
        logger.warn('Failed to load Noddi brands', { error: error.message }, 'Brands');
        return [];
      }
      const brands = (data as { brands?: NoddiBrand[] } | null)?.brands;
      return Array.isArray(brands) ? brands : [];
    },
  });

  const brands = query.data ?? [];

  /** Resolve a brand from a label/key such as "Noddi Bilpleie" or "app.noddi.no". */
  const findBrand = (label: string | null | undefined): NoddiBrand | null => {
    if (!label) return null;
    const needle = normalize(label);
    if (!needle) return null;

    return (
      brands.find((b) => normalize(b.name) === needle || normalize(b.slug) === needle) ??
      brands.find((b) => b.domain && normalize(b.domain) === needle) ??
      // host like "alfa-dekk.noddi.no" or label "Noddi Bilpleie" → prefix/contains match
      brands.find((b) => needle.startsWith(normalize(b.slug)) && normalize(b.slug).length >= 4) ??
      brands.find((b) => needle.includes(normalize(b.name)) && normalize(b.name).length >= 4) ??
      null
    );
  };

  return { brands, findBrand, isLoading: query.isLoading };
}
