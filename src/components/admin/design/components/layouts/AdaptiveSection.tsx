import { cn } from '@/lib/utils';
import React from 'react';

type ResponsiveValue<T> = T | { sm?: T; md?: T; lg?: T; xl?: T };

interface AdaptiveSectionProps {
  children: React.ReactNode;
  className?: string;
  spacing?: ResponsiveValue<string>;
  direction?: 'x' | 'y' | 'both';
  padding?: ResponsiveValue<string>;
  margin?: ResponsiveValue<string>;
  background?: 'none' | 'muted' | 'card' | 'accent';
  border?: boolean;
  rounded?: boolean;
  shadow?: 'none' | 'sm' | 'md' | 'lg';
  as?: 'div' | 'section' | 'article' | 'aside' | 'main';
}

export const AdaptiveSection: React.FC<AdaptiveSectionProps> = ({
  children,
  className,
  spacing = '4',
  direction = 'y',
  padding,
  margin,
  background = 'none',
  border = false,
  rounded = false,
  shadow = 'none',
  as: Component = 'section',
}) => {
  const getSpacingClass = (value: ResponsiveValue<string>, prefix: string) => {
    return typeof value === 'string' 
      ? `${prefix}-${value}`
      : cn(
          value.sm && `sm:${prefix}-${value.sm}`,
          value.md && `md:${prefix}-${value.md}`,
          value.lg && `lg:${prefix}-${value.lg}`,
          value.xl && `xl:${prefix}-${value.xl}`
        );
  };

  const spacingClass = (() => {
    switch (direction) {
      case 'x':
        return getSpacingClass(spacing, 'space-x');
      case 'y':
        return getSpacingClass(spacing, 'space-y');
      case 'both':
        return cn(
          getSpacingClass(spacing, 'space-x'),
          getSpacingClass(spacing, 'space-y')
        );
      default:
        return getSpacingClass(spacing, 'space-y');
    }
  })();

  const paddingClass = padding ? getSpacingClass(padding, 'p') : '';
  const marginClass = margin ? getSpacingClass(margin, 'm') : '';

  const backgroundClass = (() => {
    switch (background) {
      case 'muted':
        return 'bg-muted';
      case 'card':
        return 'bg-card';
      case 'accent':
        return 'bg-accent';
      default:
        return '';
    }
  })();

  const borderClass = border ? 'border border-border' : '';
  const roundedClass = rounded ? 'rounded-lg' : '';
  
  const shadowClass = (() => {
    switch (shadow) {
      case 'sm':
        return 'shadow-sm';
      case 'md':
        return 'shadow-md';
      case 'lg':
        return 'shadow-lg';
      default:
        return '';
    }
  })();

  return (
    <Component 
      className={cn(
        spacingClass,
        paddingClass,
        marginClass,
        backgroundClass,
        borderClass,
        roundedClass,
        shadowClass,
        className
      )}
    >
      {children}
    </Component>
  );
};