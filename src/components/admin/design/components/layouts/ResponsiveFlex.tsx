import { cn } from '@/lib/utils';
import React, { useMemo } from 'react';

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

export const ResponsiveFlex: React.FC<ResponsiveFlexProps> = React.memo(({
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
  const directionClass = useMemo(() => direction === 'responsive' 
    ? `flex-col ${breakpoint}:flex-row` 
    : `flex-${direction}`, [direction, breakpoint]);

  const wrapClass = useMemo(() => wrap ? 'flex-wrap' : 'flex-nowrap', [wrap]);

  const gapClass = useMemo(() => typeof gap === 'string' 
    ? `gap-${gap}` 
    : cn(
        gap.sm && `sm:gap-${gap.sm}`,
        gap.md && `md:gap-${gap.md}`,
        gap.lg && `lg:gap-${gap.lg}`,
        gap.xl && `xl:gap-${gap.xl}`
      ), [gap]);

  const alignmentClass = useMemo(() => `items-${alignment}`, [alignment]);
  const justifyClass = useMemo(() => `justify-${justify}`, [justify]);

  const combinedClassName = useMemo(() => cn(
    'flex',
    directionClass,
    wrapClass,
    gapClass,
    alignmentClass,
    justifyClass,
    'w-full',
    className
  ), [directionClass, wrapClass, gapClass, alignmentClass, justifyClass, className]);

  return (
    <Component className={combinedClassName}>
      {children}
    </Component>
  );
});