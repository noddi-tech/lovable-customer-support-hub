import { cn } from '@/lib/utils';
import React from 'react';

type ResponsiveValue<T> = T | { sm?: T; md?: T; lg?: T; xl?: T };

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  padding?: ResponsiveValue<string>;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '4xl' | '7xl' | 'full';
  center?: boolean;
  as?: 'div' | 'section' | 'main' | 'article';
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className,
  padding = '4',
  maxWidth = '7xl',
  center = true,
  as: Component = 'div',
}) => {
  const paddingClass = typeof padding === 'string' 
    ? `p-${padding}` 
    : cn(
        padding.sm && `sm:p-${padding.sm}`,
        padding.md && `md:p-${padding.md}`,
        padding.lg && `lg:p-${padding.lg}`,
        padding.xl && `xl:p-${padding.xl}`
      );

  const maxWidthClass = maxWidth === 'full' ? 'w-full' : `max-w-${maxWidth}`;
  const centerClass = center ? 'mx-auto' : '';

  return (
    <Component 
      className={cn(
        'w-full',
        maxWidthClass,
        centerClass,
        paddingClass,
        className
      )}
    >
      {children}
    </Component>
  );
};