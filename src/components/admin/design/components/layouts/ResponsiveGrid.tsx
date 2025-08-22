import { cn } from '@/lib/utils';
import React from 'react';

type ResponsiveValue<T> = T | { sm?: T; md?: T; lg?: T; xl?: T };

interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: ResponsiveValue<string>;
  gap?: ResponsiveValue<string>;
  autoFit?: boolean;
  minColWidth?: string;
  alignment?: 'start' | 'center' | 'end' | 'stretch';
  as?: 'div' | 'section' | 'nav' | 'main';
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  className,
  cols = { sm: '1', md: '2', lg: '3' },
  gap = '4',
  autoFit = false,
  minColWidth = '250px',
  alignment = 'start',
  as: Component = 'div',
}) => {
  const colsClass = typeof cols === 'string' 
    ? `grid-cols-${cols}`
    : cn(
        cols.sm && `sm:grid-cols-${cols.sm}`,
        cols.md && `md:grid-cols-${cols.md}`,
        cols.lg && `lg:grid-cols-${cols.lg}`,
        cols.xl && `xl:grid-cols-${cols.xl}`
      );

  const gapClass = typeof gap === 'string' 
    ? `gap-${gap}` 
    : cn(
        gap.sm && `sm:gap-${gap.sm}`,
        gap.md && `md:gap-${gap.md}`,
        gap.lg && `lg:gap-${gap.lg}`,
        gap.xl && `xl:gap-${gap.xl}`
      );

  const autoFitClass = autoFit ? `grid-cols-[repeat(auto-fit,minmax(${minColWidth},1fr))]` : '';
  const alignmentClass = `items-${alignment}`;

  return (
    <Component 
      className={cn(
        'grid',
        !autoFit && colsClass,
        autoFit && autoFitClass,
        gapClass,
        alignmentClass,
        'w-full',
        className
      )}
    >
      {children}
    </Component>
  );
};