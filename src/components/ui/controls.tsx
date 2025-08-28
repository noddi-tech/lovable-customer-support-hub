import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export interface TabsBarProps {
  value?: string;
  onValueChange?: (value: string) => void;
  tabs: Array<{ value: string; label: string; disabled?: boolean }>;
  className?: string;
  variant?: 'default' | 'pills' | 'underline';
  size?: 'sm' | 'md' | 'lg';
  equalWidth?: boolean;
}

/**
 * TabsBar: Safe tabs component that prevents overlap issues
 * Uses flex-wrap and proper spacing to handle narrow containers
 */
export function TabsBar({
  value,
  onValueChange,
  tabs,
  className,
  variant = 'default',
  size = 'md',
  equalWidth = false
}: TabsBarProps) {
  return (
    <Tabs value={value} onValueChange={onValueChange} className={cn('w-full', className)}>
      <TabsList 
        className={cn(
          'control-tabslist rounded-md bg-muted text-muted-foreground control-safe-spacing',
          equalWidth && 'grid grid-flow-col',
          equalWidth && tabs.length <= 3 && `grid-cols-${tabs.length}`,
          equalWidth && tabs.length > 3 && 'grid-cols-3'
        )}
      >
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            disabled={tab.disabled}
            className={cn(
              'control-tab',
              'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
              size === 'sm' && 'h-7 px-2 text-xs',
              size === 'md' && 'h-8 px-3 text-sm',
              size === 'lg' && 'h-9 px-4 text-sm',
              variant === 'pills' && 'rounded-full',
              variant === 'underline' && 'border-b-2 border-transparent data-[state=active]:border-primary rounded-none'
            )}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export interface ToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: 'tight' | 'normal' | 'loose';
  wrap?: boolean;
}

/**
 * Toolbar: Safe wrapper for button groups that prevents overlap
 * Uses flex-wrap to handle narrow containers gracefully
 */
export function Toolbar({ 
  className, 
  spacing = 'normal',
  wrap = true,
  children,
  ...props 
}: ToolbarProps) {
  const spacingClasses = {
    tight: 'gap-1',
    normal: 'gap-2', 
    loose: 'gap-4'
  };

  return (
    <div 
      className={cn(
        'control-toolbar',
        spacingClasses[spacing],
        wrap && 'flex-wrap',
        className
      )} 
      {...props}
    >
      {children}
    </div>
  );
}

/**
 * SafeTabsContainer: Wrapper that ensures proper spacing between tabs and content
 */
export function SafeTabsContainer({ 
  children, 
  className,
  spacing = 'normal'
}: { 
  children: React.ReactNode; 
  className?: string;
  spacing?: 'tight' | 'normal' | 'loose';
}) {
  const spacingClasses = {
    tight: 'control-safe-spacing-tight',
    normal: 'control-safe-spacing',
    loose: 'control-safe-spacing-loose'
  };

  return (
    <div className={cn(spacingClasses[spacing], className)}>
      {children}
    </div>
  );
}