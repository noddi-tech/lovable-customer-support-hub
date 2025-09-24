import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Enhanced design system interface for card-based UI with strategic theming
interface DesignSystem {
  colors: {
    primary: string;
    primaryForeground: string;
    secondary: string;
    secondaryForeground: string;
    accent: string;
    accentForeground: string;
    background: string; // Clean content background (#F8F9FB)
    foreground: string;
    muted: string; // Strategic sidebar/header background (#F1F3F7)
    mutedForeground: string;
    card: string; // Pure white cards (#FFFFFF)
    cardForeground: string;
    border: string; // Subtle borders (#E6E8EE)
    ring: string; // Brand purple for focus (#6656D9)
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
    headings: {
      colorToken: keyof DesignSystem['colors'];
      style: 'solid' | 'gradient';
      h1Size: string;
      h2Size: string;
      h3Size: string;
      fontWeight: 'normal' | 'medium' | 'semibold' | 'bold';
    };
    typography: {
      autoContrast: boolean;
      lightBackgroundTextColor: keyof DesignSystem['colors'];
      darkBackgroundTextColor: keyof DesignSystem['colors'];
      primaryBackgroundTextColor: keyof DesignSystem['colors'];
      secondaryBackgroundTextColor: keyof DesignSystem['colors'];
      warningBackgroundTextColor: keyof DesignSystem['colors'];
      contrastThreshold: number;
    };
  };
}

// Default design system values
const defaultDesignSystem: DesignSystem = {
  colors: {
    primary: '252 75% 60%', // Brand purple #6656D9 in HSL
    primaryForeground: '0 0% 100%', // Pure white in HSL
    secondary: '220 14% 96%', // Muted #F1F3F7 in HSL
    secondaryForeground: '215 25% 27%', // Dark gray in HSL
    accent: '252 75% 98%', // Very light purple in HSL
    accentForeground: '252 75% 60%', // Brand purple in HSL
    background: '210 20% 98%', // #F8F9FB in HSL
    foreground: '224 71% 4%', // Keep existing HSL
    muted: '220 14% 96%', // #F1F3F7 in HSL
    mutedForeground: '215 16% 47%', // Medium gray in HSL
    card: '0 0% 100%', // Pure white #FFFFFF in HSL
    cardForeground: '224 71% 4%', // Keep existing HSL
    border: '220 13% 91%', // #E6E8EE in HSL
    ring: '252 75% 60%', // Brand purple #6656D9 in HSL
    success: '142 76% 36%', // Green in HSL
    successForeground: '0 0% 100%', // White in HSL
    warning: '32 95% 44%', // Orange in HSL
    warningForeground: '0 0% 100%', // White in HSL
    destructive: '0 84% 60%', // Red in HSL
    destructiveForeground: '0 0% 100%', // White in HSL
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
    headings: {
      colorToken: 'primary',
      style: 'gradient',
      h1Size: '2.25rem',
      h2Size: '1.875rem',
      h3Size: '1.5rem',
      fontWeight: 'bold',
    },
    typography: {
      autoContrast: true,
      lightBackgroundTextColor: 'foreground',
      darkBackgroundTextColor: 'primaryForeground',
      primaryBackgroundTextColor: 'primaryForeground',
      secondaryBackgroundTextColor: 'secondaryForeground',
      warningBackgroundTextColor: 'foreground',
      contrastThreshold: 4.5,
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
        setDesignSystem(prev => {
          // Deep merge to ensure all new properties have defaults
          const merged = {
            ...prev,
            ...metadata.designSystem,
            colors: {
              ...prev.colors,
              ...metadata.designSystem.colors,
            },
            typography: {
              ...prev.typography,
              ...metadata.designSystem.typography,
            },
            components: {
              ...prev.components,
              ...metadata.designSystem.components,
              // Ensure typography component settings always exist with defaults
              typography: {
                ...prev.components.typography,
                ...metadata.designSystem.components?.typography,
              },
              // Ensure headings always exists with defaults
              headings: {
                ...prev.components.headings,
                ...metadata.designSystem.components?.headings,
              },
            },
          };
          return merged;
        });
      }
    }
  }, [organizationData]);

  // Apply design system to document
  const applyToDocument = () => {
    const root = document.documentElement;
    
    // Helper function to calculate luminance from HSL
    const getLuminanceFromHSL = (hslValue: string) => {
      const [h, s, l] = hslValue.split(' ').map(val => parseFloat(val.replace('%', '')));
      const lightness = l / 100;
      return lightness;
    };
    
    // Helper function to ensure proper contrast
    const ensureContrast = (backgroundHSL: string, foregroundHSL: string) => {
      const bgLuminance = getLuminanceFromHSL(backgroundHSL);
      const fgLuminance = getLuminanceFromHSL(foregroundHSL);
      
      // If contrast is poor, adjust foreground
      const ratio = Math.max(bgLuminance, fgLuminance) / Math.min(bgLuminance, fgLuminance);
      if (ratio < 4.5) { // WCAG AA standard
        // If background is light, use dark foreground; if dark, use light foreground
        return bgLuminance > 0.5 ? '224 71% 4%' : '0 0% 98%';
      }
      return foregroundHSL;
    };
    
    // Apply colors with proper CSS variable mapping and contrast checking
    Object.entries(designSystem.colors).forEach(([key, value]) => {
      const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
      // Set the HSL value directly without modification
      root.style.setProperty(cssVar, value);
      
      // Auto-generate proper foreground colors for backgrounds
      if (!key.includes('Foreground') && !key.includes('foreground')) {
        const foregroundKey = `${key}Foreground`;
        const foregroundCssVar = `--${foregroundKey.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
        
        // Check if we have a corresponding foreground color defined
        if (designSystem.colors[foregroundKey as keyof typeof designSystem.colors]) {
          const foregroundValue = designSystem.colors[foregroundKey as keyof typeof designSystem.colors];
          const adjustedForeground = ensureContrast(value, foregroundValue);
          root.style.setProperty(foregroundCssVar, adjustedForeground);
        } else {
          // Auto-generate foreground color for good contrast
          const autoForeground = ensureContrast(value, '224 71% 4%'); // Default dark text
          root.style.setProperty(foregroundCssVar, autoForeground);
        }
      }
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

    // Apply heading styles
    const headingColorValue = designSystem.colors[designSystem.components.headings.colorToken];
    root.style.setProperty('--heading-color', headingColorValue);
    root.style.setProperty('--heading-h1-size', designSystem.components.headings.h1Size);
    root.style.setProperty('--heading-h2-size', designSystem.components.headings.h2Size);
    root.style.setProperty('--heading-h3-size', designSystem.components.headings.h3Size);
    root.style.setProperty('--heading-font-weight', designSystem.typography.fontWeight[designSystem.components.headings.fontWeight]);
    root.style.setProperty('--heading-style', designSystem.components.headings.style);
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
              colors: {
                ...prev.colors,
                ...newData.metadata.designSystem.colors,
              },
              typography: {
                ...prev.typography,
                ...newData.metadata.designSystem.typography,
              },
              components: {
                ...prev.components,
                ...newData.metadata.designSystem.components,
                // Ensure typography component settings always exist with defaults
                typography: {
                  ...prev.components.typography,
                  ...newData.metadata.designSystem.components?.typography,
                },
                // Ensure headings always exists with defaults
                headings: {
                  ...prev.components.headings,
                  ...newData.metadata.designSystem.components?.headings,
                },
              },
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