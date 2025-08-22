import { cn } from '@/lib/utils';
import React, { useMemo, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ResponsiveValue<T> = T | { sm?: T; md?: T; lg?: T; xl?: T };

interface TabItem {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
}

interface ResponsiveTabsProps {
  items: TabItem[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  orientation?: 'horizontal' | 'vertical' | 'responsive';
  breakpoint?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'pills' | 'underline';
  spacing?: ResponsiveValue<string>;
  fullWidth?: boolean;
}

export const ResponsiveTabs: React.FC<ResponsiveTabsProps> = React.memo(({
  items,
  defaultValue,
  value,
  onValueChange,
  className,
  orientation = 'responsive',
  breakpoint = 'md',
  variant = 'default',
  spacing = '4',
  fullWidth = false,
}) => {
  const orientationClass = useMemo(() => orientation === 'responsive' 
    ? `flex-col ${breakpoint}:flex-row`
    : orientation === 'vertical' 
      ? 'flex-col' 
      : 'flex-row', [orientation, breakpoint]);

  const spacingClass = useMemo(() => typeof spacing === 'string' 
    ? `gap-${spacing}` 
    : cn(
        spacing.sm && `sm:gap-${spacing.sm}`,
        spacing.md && `md:gap-${spacing.md}`,
        spacing.lg && `lg:gap-${spacing.lg}`,
        spacing.xl && `xl:gap-${spacing.xl}`
      ), [spacing]);

  const tabsListClass = useMemo(() => cn(
    'flex',
    orientationClass,
    spacingClass,
    fullWidth && 'w-full',
    variant === 'pills' && 'bg-muted p-1 rounded-lg',
    variant === 'underline' && 'border-b'
  ), [orientationClass, spacingClass, fullWidth, variant]);

  const tabsTriggerClass = useMemo(() => cn(
    fullWidth && 'flex-1',
    variant === 'pills' && 'rounded-md',
    variant === 'underline' && 'border-b-2 border-transparent data-[state=active]:border-primary'
  ), [fullWidth, variant]);

  const tabsClassName = useMemo(() => cn('w-full', className), [className]);
  const tabsOrientation = useMemo(() => orientation === 'vertical' ? 'vertical' : 'horizontal', [orientation]);

  const memoizedOnValueChange = useCallback((newValue: string) => {
    onValueChange?.(newValue);
  }, [onValueChange]);

  return (
    <Tabs
      defaultValue={defaultValue}
      value={value}
      onValueChange={memoizedOnValueChange}
      className={tabsClassName}
      orientation={tabsOrientation}
    >
      <TabsList className={tabsListClass}>
        {items.map((item) => (
          <TabsTrigger
            key={item.value}
            value={item.value}
            className={tabsTriggerClass}
          >
            {item.icon && (
              <item.icon className="w-4 h-4 mr-2" />
            )}
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {items.map((item) => (
        <TabsContent
          key={item.value}
          value={item.value}
          className="mt-4 focus-visible:outline-none"
        >
          {item.content}
        </TabsContent>
      ))}
    </Tabs>
  );
});