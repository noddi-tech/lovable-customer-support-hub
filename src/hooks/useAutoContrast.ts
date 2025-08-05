import { useDesignSystem } from '@/contexts/DesignSystemContext';

export const useAutoContrast = () => {
  const { designSystem } = useDesignSystem();

  // Calculate luminance from HSL string
  const getLuminanceFromHSL = (hslValue: string): number => {
    const [h, s, l] = hslValue.split(' ').map(val => parseFloat(val.replace('%', '')));
    return l / 100;
  };

  // Determine if background is light or dark
  const isLightBackground = (backgroundColorKey: keyof typeof designSystem.colors): boolean => {
    const hslValue = designSystem.colors[backgroundColorKey];
    const luminance = getLuminanceFromHSL(hslValue);
    return luminance > 0.5;
  };

  // Get appropriate text color for any background
  const getContrastTextColor = (backgroundColorKey: keyof typeof designSystem.colors): string => {
    if (!designSystem.components.typography.autoContrast) {
      return designSystem.colors.foreground;
    }

    // Special handling for specific background types
    switch (backgroundColorKey) {
      case 'primary':
        return designSystem.colors[designSystem.components.typography.primaryBackgroundTextColor];
      case 'secondary':
        return designSystem.colors[designSystem.components.typography.secondaryBackgroundTextColor];
      case 'warning':
      case 'warningForeground':
        return designSystem.colors[designSystem.components.typography.warningBackgroundTextColor];
      default:
        // Auto-calculate based on lightness
        if (isLightBackground(backgroundColorKey)) {
          return designSystem.colors[designSystem.components.typography.lightBackgroundTextColor];
        } else {
          return designSystem.colors[designSystem.components.typography.darkBackgroundTextColor];
        }
    }
  };

  // Get CSS-ready color value (with hsl() wrapper)
  const getContrastTextColorCSS = (backgroundColorKey: keyof typeof designSystem.colors): string => {
    const color = getContrastTextColor(backgroundColorKey);
    return `hsl(${color})`;
  };

  // Get text color for message types specifically with guaranteed contrast
  const getMessageTextColor = (messageType: 'agent' | 'customer' | 'internal'): string => {
    switch (messageType) {
      case 'agent':
        // For blue backgrounds, always use white text
        return 'hsl(0 0% 98%)';
      case 'customer':
        // For white/light backgrounds, always use dark text
        return 'hsl(224 71% 4%)';
      case 'internal':
        // For warning/yellow backgrounds, always use dark text
        return 'hsl(224 71% 4%)';
      default:
        return 'hsl(224 71% 4%)';
    }
  };

  return {
    getContrastTextColor,
    getContrastTextColorCSS,
    getMessageTextColor,
    isLightBackground,
    autoContrastEnabled: designSystem.components.typography.autoContrast,
  };
};