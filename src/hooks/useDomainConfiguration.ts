import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DomainConfig {
  id: string;
  domain: string;
  parse_subdomain: string;
  status: string;
  dns_records: Record<string, any>;
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

      const { data, error } = await supabase
        .from('email_domains')
        .select('*')
        .eq('organization_id', profile.organization_id);

      if (error) throw error;
      return data as DomainConfig[];
    },
  });

  const getActiveDomain = () => {
    return domains?.find(d => d.status === 'active');
  };

  const getDomainByName = (domainName: string) => {
    return domains?.find(d => d.domain === domainName);
  };

  const isDomainConfigured = (domainName: string) => {
    const domain = getDomainByName(domainName);
    return domain?.status === 'active';
  };

  const extractDomainFromEmail = (email: string): string | null => {
    const match = email.match(/@(.+)$/);
    return match ? match[1].toLowerCase() : null;
  };

  const generateForwardingAddress = (email: string, activeDomain?: DomainConfig) => {
    const localPart = email.split('@')[0];
    const domain = activeDomain || getActiveDomain();
    
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
    getDomainByName,
    isDomainConfigured,
    extractDomainFromEmail,
    generateForwardingAddress,
  };
}
