import { cn } from '@/lib/utils';
import React, { useMemo } from 'react';

type ResponsiveValue<T> = T | { sm?: T; md?: T; lg?: T; xl?: T };

interface LayoutItemProps {
  children: React.ReactNode;
  className?: string;
  flex?: 'none' | 'auto' | '1' | 'initial';
  grow?: boolean;
  shrink?: boolean;
  basis?: string;
  minWidth?: ResponsiveValue<string>;
  maxWidth?: ResponsiveValue<string>;
  order?: ResponsiveValue<string>;
  align?: 'auto' | 'start' | 'center' | 'end' | 'stretch';
  as?: 'div' | 'section' | 'article' | 'aside';
}

export const LayoutItem: React.FC<LayoutItemProps> = React.memo(({
  children,
  className,
  flex = '1',
  grow = true,
  shrink = true,
  basis = 'auto',
  minWidth,
  maxWidth,
  order,
  align = 'auto',
  as: Component = 'div',
}) => {
  const flexClass = useMemo(() => flex !== 'none' ? `flex-${flex}` : 'flex-none', [flex]);
  const growClass = useMemo(() => grow ? 'flex-grow' : 'flex-grow-0', [grow]);
  const shrinkClass = useMemo(() => shrink ? 'flex-shrink' : 'flex-shrink-0', [shrink]);
  const basisClass = useMemo(() => basis !== 'auto' ? `flex-basis-${basis}` : '', [basis]);

  const minWidthClass = useMemo(() => minWidth ? (
    typeof minWidth === 'string' 
      ? `min-w-[${minWidth}]`
      : cn(
          minWidth.sm && `sm:min-w-[${minWidth.sm}]`,
          minWidth.md && `md:min-w-[${minWidth.md}]`,
          minWidth.lg && `lg:min-w-[${minWidth.lg}]`,
          minWidth.xl && `xl:min-w-[${minWidth.xl}]`
        )
  ) : '', [minWidth]);

  const maxWidthClass = useMemo(() => maxWidth ? (
    typeof maxWidth === 'string' 
      ? `max-w-[${maxWidth}]`
      : cn(
          maxWidth.sm && `sm:max-w-[${maxWidth.sm}]`,
          maxWidth.md && `md:max-w-[${maxWidth.md}]`,
          maxWidth.lg && `lg:max-w-[${maxWidth.lg}]`,
          maxWidth.xl && `xl:max-w-[${maxWidth.xl}]`
        )
  ) : '', [maxWidth]);

  const orderClass = useMemo(() => order ? (
    typeof order === 'string' 
      ? `order-${order}`
      : cn(
          order.sm && `sm:order-${order.sm}`,
          order.md && `md:order-${order.md}`,
          order.lg && `lg:order-${order.lg}`,
          order.xl && `xl:order-${order.xl}`
        )
  ) : '', [order]);

  const alignClass = useMemo(() => align !== 'auto' ? `self-${align}` : '', [align]);

  const combinedClassName = useMemo(() => cn(
    flexClass,
    grow && growClass,
    shrink && shrinkClass,
    basisClass,
    minWidthClass,
    maxWidthClass,
    orderClass,
    alignClass,
    className
  ), [flexClass, grow, growClass, shrink, shrinkClass, basisClass, minWidthClass, maxWidthClass, orderClass, alignClass, className]);

  return (
    <Component className={combinedClassName}>
      {children}
    </Component>
  );
});