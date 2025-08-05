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

  // Get text color for message types using design system
  const getMessageTextColor = (messageType: 'agent' | 'customer' | 'internal'): string => {
    let color: string;
    
    switch (messageType) {
      case 'agent':
        // If agent messages actually appear with white background, use dark text
        // Otherwise if they have blue background (bg-primary), use white text
        color = 'hsl(224 71% 4%)'; // Dark text for white background
        break;
      case 'customer':
        // Use dark text for customer messages (white background)
        color = 'hsl(224 71% 4%)';
        break;
      case 'internal':
        // Use dark text for internal notes (yellow background)
        color = 'hsl(224 71% 4%)';
        break;
      default:
        color = getContrastTextColorCSS('background');
    }
    
    // Debug logging
    console.log(`Message type: ${messageType}, Color: ${color}`);
    
    return color;
  };

  return {
    getContrastTextColor,
    getContrastTextColorCSS,
    getMessageTextColor,
    isLightBackground,
    autoContrastEnabled: designSystem.components.typography.autoContrast,
  };
};