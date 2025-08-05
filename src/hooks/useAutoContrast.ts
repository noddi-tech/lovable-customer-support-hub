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
        // Use primary background text color from design system
        color = getContrastTextColorCSS('primary');
        break;
      case 'customer':
        // Use card background text color from design system
        color = getContrastTextColorCSS('card');
        break;
      case 'internal':
        // Use warning background text color from design system
        color = getContrastTextColorCSS('warning');
        break;
      default:
        color = getContrastTextColorCSS('background');
    }
    
    // Debug logging
    console.log(`Message type: ${messageType}, Color: ${color}`);
    console.log(`Design system colors:`, designSystem.colors);
    console.log(`Typography settings:`, designSystem.components.typography);
    
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