import { cn } from '@/lib/utils';
import React from 'react';

type ResponsiveValue<T> = T | { sm?: T; md?: T; lg?: T; xl?: T };

interface ResponsiveFlexProps {
  children: React.ReactNode;
  className?: string;
  direction?: 'row' | 'col' | 'responsive';
  breakpoint?: 'sm' | 'md' | 'lg' | 'xl';
  gap?: ResponsiveValue<string>;
  wrap?: boolean;
  alignment?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  as?: 'div' | 'section' | 'nav' | 'header' | 'footer';
}

export const ResponsiveFlex: React.FC<ResponsiveFlexProps> = ({
  children,
  className,
  direction = 'responsive',
  breakpoint = 'md',
  gap = '4',
  wrap = true,
  alignment = 'start',
  justify = 'start',
  as: Component = 'div',
}) => {
  const directionClass = direction === 'responsive' 
    ? `flex-col ${breakpoint}:flex-row` 
    : `flex-${direction}`;

  const wrapClass = wrap ? 'flex-wrap' : 'flex-nowrap';

  const gapClass = typeof gap === 'string' 
    ? `gap-${gap}` 
    : cn(
        gap.sm && `sm:gap-${gap.sm}`,
        gap.md && `md:gap-${gap.md}`,
        gap.lg && `lg:gap-${gap.lg}`,
        gap.xl && `xl:gap-${gap.xl}`
      );

  const alignmentClass = `items-${alignment}`;
  const justifyClass = `justify-${justify}`;

  return (
    <Component 
      className={cn(
        'flex',
        directionClass,
        wrapClass,
        gapClass,
        alignmentClass,
        justifyClass,
        'w-full',
        className
      )}
    >
      {children}
    </Component>
  );
};