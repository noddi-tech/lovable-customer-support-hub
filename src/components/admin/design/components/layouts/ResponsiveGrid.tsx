import { cn } from '@/lib/utils';
import React, { useMemo } from 'react';

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

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = React.memo(({
  children,
  className,
  cols = { sm: '1', md: '2', lg: '3' },
  gap = '4',
  autoFit = false,
  minColWidth = '250px',
  alignment = 'start',
  as: Component = 'div',
}) => {
  const colsClass = useMemo(() => typeof cols === 'string' 
    ? `grid-cols-${cols}`
    : cn(
        cols.sm && `sm:grid-cols-${cols.sm}`,
        cols.md && `md:grid-cols-${cols.md}`,
        cols.lg && `lg:grid-cols-${cols.lg}`,
        cols.xl && `xl:grid-cols-${cols.xl}`
      ), [cols]);

  const gapClass = useMemo(() => typeof gap === 'string' 
    ? `gap-${gap}` 
    : cn(
        gap.sm && `sm:gap-${gap.sm}`,
        gap.md && `md:gap-${gap.md}`,
        gap.lg && `lg:gap-${gap.lg}`,
        gap.xl && `xl:gap-${gap.xl}`
      ), [gap]);

  const autoFitClass = useMemo(() => autoFit ? `grid-cols-[repeat(auto-fit,minmax(${minColWidth},1fr))]` : '', [autoFit, minColWidth]);
  const alignmentClass = useMemo(() => `items-${alignment}`, [alignment]);

  const combinedClassName = useMemo(() => cn(
    'grid',
    !autoFit && colsClass,
    autoFit && autoFitClass,
    gapClass,
    alignmentClass,
    'w-full',
    className
  ), [autoFit, colsClass, autoFitClass, gapClass, alignmentClass, className]);

  return (
    <Component className={combinedClassName}>
      {children}
    </Component>
  );
});