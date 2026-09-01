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

/**
 * Known brands, used only when the Noddi catalog is unreachable so agents can
 * still categorise a conversation.
 */
const FALLBACK_BRANDS: NoddiBrand[] = [
  { id: -1, name: 'Alfa Dekk', slug: 'alfa-dekk', domain: 'alfa-dekk', logo_url: null },
  { id: -2, name: 'BestDrive', slug: 'bestdrive', domain: 'bestdrive', logo_url: null },
  { id: -3, name: 'Boligbyggelaget TOBB', slug: 'boligbyggelaget-tobb', domain: 'tobb', logo_url: null },
  { id: -4, name: 'Coming soon', slug: 'coming-soon', domain: 'coming-soon', logo_url: null },
  { id: -5, name: 'Dekkfix', slug: 'dekkfix', domain: 'dekkfix', logo_url: null },
  { id: -6, name: 'Dekkstra', slug: 'dekkstra', domain: 'dekkstra', logo_url: null },
  { id: -7, name: 'Dekkteam', slug: 'dekkteam', domain: 'dekkteam', logo_url: null },
  { id: -8, name: 'Elite Bilvask', slug: 'elite-bilvask', domain: 'elitebilvask', logo_url: null },
  { id: -9, name: 'Hurtigruta Carglass', slug: 'hurtigruta-carglass', domain: 'carglass', logo_url: null },
  { id: -10, name: 'Lotus Cars', slug: 'lotus', domain: 'lotus', logo_url: null },
  { id: -11, name: 'Noddi', slug: 'noddi', domain: 'noddi', logo_url: null },
  { id: -12, name: 'Shine', slug: 'shine', domain: 'shine', logo_url: null },
  { id: -13, name: 'Trønderdekk', slug: 'tronderdekk', domain: 'tronderdekk', logo_url: null },
];

/** Brand catalog from the Noddi backend (names + logos), cached for the session. */
export function useNoddiBrands() {
  const query = useQuery({
    queryKey: ['noddi-brands'],
    // Cached for hours; refetched automatically once the cache expires.
    staleTime: 6 * 60 * 60 * 1000,
    gcTime: 12 * 60 * 60 * 1000,
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

  const fetched = query.data ?? [];
  const brands = fetched.length > 0 ? fetched : FALLBACK_BRANDS;

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
