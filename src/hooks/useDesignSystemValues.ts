import { useDesignSystem } from '@/contexts/DesignSystemContext';

// Utility hooks for accessing specific design system values
export const useColors = () => {
  const { designSystem } = useDesignSystem();
  return designSystem.colors;
};

export const useTypography = () => {
  const { designSystem } = useDesignSystem();
  return designSystem.typography;
};

export const useSpacing = () => {
  const { designSystem } = useDesignSystem();
  return designSystem.spacing;
};

export const useBorderRadius = () => {
  const { designSystem } = useDesignSystem();
  return designSystem.borderRadius;
};

export const useShadows = () => {
  const { designSystem } = useDesignSystem();
  return designSystem.shadows;
};

export const useGradients = () => {
  const { designSystem } = useDesignSystem();
  return designSystem.gradients;
};

export const useComponents = () => {
  const { designSystem } = useDesignSystem();
  return designSystem.components;
};

// Utility functions for creating dynamic styles
export const createDynamicStyle = (properties: Record<string, string>) => {
  return properties;
};

export const hsl = (value: string) => `hsl(${value})`;

// Helper hooks for getting component-specific styles
export const useButtonStyles = (variant: 'primary' | 'secondary' = 'primary') => {
  const { designSystem } = useDesignSystem();
  const colors = designSystem.colors;
  const components = designSystem.components;
  
  const baseStyles = {
    borderRadius: components.buttons.borderRadius,
  };
  
  if (variant === 'primary') {
    return {
      ...baseStyles,
      backgroundColor: `hsl(${colors[components.buttons.primaryColor]})`,
      color: `hsl(${colors.primaryForeground})`,
    };
  }
  
  return {
    ...baseStyles,
    backgroundColor: `hsl(${colors[components.buttons.secondaryColor]})`,
    color: `hsl(${colors.secondaryForeground})`,
    border: `1px solid hsl(${colors.border})`,
  };
};

export const useCardStyles = () => {
  try {
    const { designSystem } = useDesignSystem();
    const colors = designSystem.colors;
    const components = designSystem.components;
  
    return {
      backgroundColor: `hsl(${colors[components.cards.backgroundColor]})`,
      color: `hsl(${colors.cardForeground})`,
      borderRadius: components.cards.borderRadius,
      boxShadow: designSystem.shadows[components.cards.shadow as keyof typeof designSystem.shadows],
    };
  } catch (error) {
    // Fallback styles when design system context is not available
    return {
      backgroundColor: 'hsl(0 0% 100%)',
      color: 'hsl(224 71% 4%)',
      borderRadius: '0.75rem',
      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    };
  }
};