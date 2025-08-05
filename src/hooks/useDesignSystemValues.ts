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

// Helper for getting component-specific styles
export const getButtonStyles = (variant: 'primary' | 'secondary' = 'primary') => {
  const { designSystem } = useDesignSystem();
  const colors = designSystem.colors;
  const components = designSystem.components;
  
  const baseStyles = {
    borderRadius: components.buttons.borderRadius,
    padding: components.buttons.padding,
  };
  
  if (variant === 'primary') {
    return {
      ...baseStyles,
      backgroundColor: `hsl(${colors.primary})`,
      color: `hsl(${colors.primaryForeground})`,
    };
  }
  
  return {
    ...baseStyles,
    backgroundColor: `hsl(${colors.secondary})`,
    color: `hsl(${colors.secondaryForeground})`,
    border: `1px solid hsl(${colors.border})`,
  };
};

export const getCardStyles = () => {
  const { designSystem } = useDesignSystem();
  const colors = designSystem.colors;
  const components = designSystem.components;
  
  return {
    backgroundColor: `hsl(${colors.card})`,
    color: `hsl(${colors.cardForeground})`,
    borderRadius: components.cards.borderRadius,
    padding: components.cards.padding,
    boxShadow: components.cards.shadow,
  };
};