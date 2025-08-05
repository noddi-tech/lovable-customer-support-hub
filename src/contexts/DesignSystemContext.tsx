import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Define the design system interface based on the current structure
interface DesignSystem {
  colors: {
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    accent: string;
    accentForeground: string;
    background: string;
    foreground: string;
    muted: string;
    mutedForeground: string;
    card: string;
    cardForeground: string;
    border: string;
    success: string;
    successForeground: string;
    warning: string;
    warningForeground: string;
    destructive: string;
    destructiveForeground: string;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
    };
    fontWeight: {
      normal: string;
      medium: string;
      semibold: string;
      bold: string;
    };
    lineHeight: {
      tight: string;
      normal: string;
      relaxed: string;
    };
  };
  spacing: {
    baseUnit: number;
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    glow: string;
  };
  gradients: {
    primary: string;
    surface: string;
  };
  components: {
    buttons: {
      defaultVariant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
      defaultSize: 'default' | 'sm' | 'lg' | 'icon';
      borderRadius: string;
      primaryColor: keyof DesignSystem['colors'];
      secondaryColor: keyof DesignSystem['colors'];
    };
    cards: {
      defaultVariant: 'default' | 'outline' | 'elevated';
      borderRadius: string;
      shadow: 'none' | 'sm' | 'md' | 'lg';
      backgroundColor: keyof DesignSystem['colors'];
      borderColor: keyof DesignSystem['colors'];
    };
    badges: {
      defaultVariant: 'default' | 'secondary' | 'destructive' | 'outline';
      primaryColor: keyof DesignSystem['colors'];
      secondaryColor: keyof DesignSystem['colors'];
      borderRadius: string;
    };
    alerts: {
      borderRadius: string;
      defaultVariant: 'default' | 'destructive';
      showIcon: boolean;
    };
    avatars: {
      defaultSize: 'sm' | 'md' | 'lg';
      borderRadius: string;
      borderWidth: string;
      borderColor: keyof DesignSystem['colors'];
    };
    icons: {
      defaultSize: 'sm' | 'md' | 'lg';
      strokeWidth: number;
      primaryColor: keyof DesignSystem['colors'];
    };
  };
}

// Default design system values
const defaultDesignSystem: DesignSystem = {
  colors: {
    primary: '217 91% 60%',
    primaryForeground: '0 0% 98%',
    secondary: '220 14% 96%',
    secondaryForeground: '220 9% 46%',
    accent: '217 91% 95%',
    accentForeground: '217 91% 40%',
    background: '250 50% 98%',
    foreground: '224 71% 4%',
    muted: '220 14% 96%',
    mutedForeground: '220 9% 46%',
    card: '0 0% 100%',
    cardForeground: '224 71% 4%',
    border: '220 13% 91%',
    success: '142 76% 36%',
    successForeground: '0 0% 98%',
    warning: '38 92% 50%',
    warningForeground: '0 0% 98%',
    destructive: '0 84% 60%',
    destructiveForeground: '0 0% 98%',
  },
  typography: {
    fontFamily: 'Inter, system-ui, sans-serif',
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
    },
    fontWeight: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    lineHeight: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },
  },
  spacing: {
    baseUnit: 4,
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
  },
  borderRadius: {
    sm: '0.375rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    glow: '0 0 0 3px hsl(217 91% 60% / 0.1)',
  },
  gradients: {
    primary: 'linear-gradient(135deg, hsl(217 91% 60%), hsl(217 91% 55%))',
    surface: 'linear-gradient(135deg, hsl(0 0% 100%), hsl(220 14% 98%))',
  },
  components: {
    buttons: {
      defaultVariant: 'default',
      defaultSize: 'default',
      borderRadius: '0.5rem',
      primaryColor: 'primary',
      secondaryColor: 'secondary',
    },
    cards: {
      defaultVariant: 'default',
      borderRadius: '0.75rem',
      shadow: 'md',
      backgroundColor: 'card',
      borderColor: 'border',
    },
    badges: {
      defaultVariant: 'default',
      primaryColor: 'primary',
      secondaryColor: 'secondary',
      borderRadius: '0.375rem',
    },
    alerts: {
      borderRadius: '0.5rem',
      defaultVariant: 'default',
      showIcon: true,
    },
    avatars: {
      defaultSize: 'md',
      borderRadius: '50%',
      borderWidth: '2px',
      borderColor: 'border',
    },
    icons: {
      defaultSize: 'md',
      strokeWidth: 2,
      primaryColor: 'foreground',
    },
  },
};

interface DesignSystemContextType {
  designSystem: DesignSystem;
  updateDesignSystem: (updates: Partial<DesignSystem>) => void;
  saveDesignSystem: () => Promise<void>;
  isLoading: boolean;
  applyToDocument: () => void;
  organizationId: string | null;
}

const DesignSystemContext = createContext<DesignSystemContextType | undefined>(undefined);

export const useDesignSystem = () => {
  const context = useContext(DesignSystemContext);
  if (context === undefined) {
    throw new Error('useDesignSystem must be used within a DesignSystemProvider');
  }
  return context;
};

interface DesignSystemProviderProps {
  children: ReactNode;
}

export const DesignSystemProvider: React.FC<DesignSystemProviderProps> = ({ children }) => {
  const [designSystem, setDesignSystem] = useState<DesignSystem>(defaultDesignSystem);

  // Get user's organization ID from auth context
  const { profile } = useAuth();

  // Fetch organization-specific design system from database
  const { data: organizationData, isLoading } = useQuery({
    queryKey: ['organization-design-system', profile?.organization_id],
    queryFn: async () => {
      if (!profile?.organization_id) return null;
      
      const { data, error } = await supabase
        .from('organizations')
        .select('metadata')
        .eq('id', profile.organization_id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.organization_id,
  });

  // Update design system when database data changes
  useEffect(() => {
    if (organizationData?.metadata && typeof organizationData.metadata === 'object') {
      const metadata = organizationData.metadata as any;
      if (metadata.designSystem) {
        setDesignSystem(prev => ({
          ...prev,
          ...metadata.designSystem,
        }));
      }
    }
  }, [organizationData]);

  // Apply design system to document
  const applyToDocument = () => {
    const root = document.documentElement;
    
    // Apply colors with proper CSS variable mapping
    Object.entries(designSystem.colors).forEach(([key, value]) => {
      const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      root.style.setProperty(cssVar, value);
    });

    // Apply typography
    root.style.setProperty('--font-family', designSystem.typography.fontFamily);
    Object.entries(designSystem.typography.fontSize).forEach(([key, value]) => {
      root.style.setProperty(`--font-size-${key}`, value);
    });

    // Apply spacing
    Object.entries(designSystem.spacing).forEach(([key, value]) => {
      if (typeof value === 'string') {
        root.style.setProperty(`--space-${key}`, value);
      }
    });

    // Apply border radius
    Object.entries(designSystem.borderRadius).forEach(([key, value]) => {
      root.style.setProperty(`--radius-${key}`, value);
    });

    // Apply shadows
    Object.entries(designSystem.shadows).forEach(([key, value]) => {
      root.style.setProperty(`--shadow-${key}`, value);
    });

    // Apply gradients
    Object.entries(designSystem.gradients).forEach(([key, value]) => {
      root.style.setProperty(`--gradient-${key}`, value);
    });

    // Apply component-specific styles
    Object.entries(designSystem.components.buttons).forEach(([key, value]) => {
      if (typeof value === 'string') {
        root.style.setProperty(`--button-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value);
      }
    });

    Object.entries(designSystem.components.cards).forEach(([key, value]) => {
      if (typeof value === 'string') {
        root.style.setProperty(`--card-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`, value);
      }
    });
  };

  // Apply design system whenever it changes
  useEffect(() => {
    applyToDocument();
  }, [designSystem]);

  // Set up real-time updates for design system changes
  useEffect(() => {
    if (!profile?.organization_id) return;

    const channel = supabase
      .channel('design-system-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'organizations',
          filter: `id=eq.${profile.organization_id}`,
        },
        (payload) => {
          const newData = payload.new as any;
          if (newData.metadata && newData.metadata.designSystem) {
            setDesignSystem(prev => ({
              ...prev,
              ...newData.metadata.designSystem,
            }));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.organization_id]);

  const updateDesignSystem = (updates: Partial<DesignSystem>) => {
    setDesignSystem(prev => ({
      ...prev,
      ...updates,
    }));
  };

  const saveDesignSystem = async () => {
    if (!profile?.organization_id) {
      throw new Error('No organization ID available');
    }

    const { error } = await supabase
      .from('organizations')
      .update({ 
        metadata: { designSystem } as any
      })
      .eq('id', profile.organization_id);

    if (error) {
      throw error;
    }
  };

  const value: DesignSystemContextType = {
    designSystem,
    updateDesignSystem,
    saveDesignSystem,
    isLoading,
    applyToDocument,
    organizationId: profile?.organization_id || null,
  };

  return (
    <DesignSystemContext.Provider value={value}>
      {children}
    </DesignSystemContext.Provider>
  );
};