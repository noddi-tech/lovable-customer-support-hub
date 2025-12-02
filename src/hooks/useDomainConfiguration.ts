import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DomainConfig {
  id: string;
  domain: string;
  parse_subdomain: string;
  status: string;
  dns_records: Record<string, any>;
  route_count?: number;
}

export function useDomainConfiguration() {
  const { data: domains, isLoading, error, refetch } = useQuery({
    queryKey: ['email-domains'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('user_id', user.id)
        .single();
      
      if (!profile) throw new Error('Profile not found');

      // Fetch domains
      const { data: domainsData, error: domainsError } = await supabase
        .from('email_domains')
        .select('*')
        .eq('organization_id', profile.organization_id);

      if (domainsError) throw domainsError;
      
      // Fetch route counts for each domain
      const domainsWithRoutes = await Promise.all(
        (domainsData || []).map(async (domain) => {
          const { count } = await supabase
            .from('inbound_routes')
            .select('*', { count: 'exact', head: true })
            .eq('domain_id', domain.id);
          
          return {
            ...domain,
            route_count: count || 0,
          };
        })
      );

      return domainsWithRoutes as DomainConfig[];
    },
  });

  // Get domain with 'active' status
  const getActiveDomain = () => {
    return domains?.find(d => d.status === 'active');
  };

  // Get a configured domain - either active OR has existing routes (proof it works)
  const getConfiguredDomain = () => {
    // First priority: active status
    const active = domains?.find(d => d.status === 'active');
    if (active) return active;
    
    // Second priority: pending domain with existing routes (demonstrably working)
    const pendingWithRoutes = domains?.find(d => 
      d.status === 'pending' && (d.route_count || 0) > 0
    );
    if (pendingWithRoutes) return pendingWithRoutes;
    
    // Last resort: any domain (even pending without routes)
    return domains?.[0];
  };

  const getDomainByName = (domainName: string) => {
    return domains?.find(d => d.domain === domainName);
  };

  const isDomainConfigured = (domainName: string) => {
    const domain = getDomainByName(domainName);
    if (!domain) return false;
    // Domain is configured if active OR has existing routes
    return domain.status === 'active' || (domain.route_count || 0) > 0;
  };

  const extractDomainFromEmail = (email: string): string | null => {
    const match = email.match(/@(.+)$/);
    return match ? match[1].toLowerCase() : null;
  };

  const generateForwardingAddress = (email: string, configuredDomain?: DomainConfig) => {
    const localPart = email.split('@')[0];
    const domain = configuredDomain || getConfiguredDomain();
    
    if (domain) {
      return `${localPart}@${domain.parse_subdomain}.${domain.domain}`;
    }
    
    // Fallback - this shouldn't happen in production
    return `${localPart}@inbound.noddi.no`;
  };

  return {
    domains,
    isLoading,
    error,
    refetch,
    getActiveDomain,
    getConfiguredDomain,
    getDomainByName,
    isDomainConfigured,
    extractDomainFromEmail,
    generateForwardingAddress,
  };
}
