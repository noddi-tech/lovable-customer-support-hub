import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface SafeTabsWrapperProps {
  value?: string;
  onValueChange?: (value: string) => void;
  tabs: Array<{
    value: string;
    label: string;
    disabled?: boolean;
    content?: React.ReactNode;
  }>;
  className?: string;
  listClassName?: string;
  contentClassName?: string;
  spacing?: 'tight' | 'normal' | 'loose';
  wrap?: boolean;
}

/**
 * SafeTabsWrapper: Prevents overlap issues with standardized spacing and wrapping
 * - Always allows tabs to wrap gracefully
 * - Ensures consistent spacing below TabsList
 * - Prevents whitespace-nowrap issues
 */
export function SafeTabsWrapper({
  value,
  onValueChange,
  tabs,
  className,
  listClassName,
  contentClassName,
  spacing = 'normal',
  wrap = true,
  ...props
}: SafeTabsWrapperProps) {
  const spacingClasses = {
    tight: 'mb-2',
    normal: 'mb-3',
    loose: 'mb-4'
  };

  return (
    <Tabs 
      value={value} 
      onValueChange={onValueChange} 
      className={cn('w-full', className)}
      {...props}
    >
      <TabsList 
        className={cn(
          'h-auto min-h-[32px] p-1 gap-1 bg-muted',
          wrap && 'flex-wrap',
          spacingClasses[spacing],
          listClassName
        )}
      >
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            disabled={tab.disabled}
            className={cn(
              'px-3 py-1.5 text-sm truncate min-w-0',
              'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm'
            )}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
      
      {tabs.map((tab) => (
        tab.content && (
          <TabsContent
            key={tab.value}
            value={tab.value}
            className={cn('mt-0', contentClassName)}
          >
            {tab.content}
          </TabsContent>
        )
      ))}
    </Tabs>
  );
}

interface SafeToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  spacing?: 'tight' | 'normal' | 'loose';
  wrap?: boolean;
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
}

/**
 * SafeToolbar: Prevents button overflow with automatic wrapping
 */
export function SafeToolbar({
  className,
  spacing = 'normal',
  wrap = true,
  justify = 'start',
  children,
  ...props
}: SafeToolbarProps) {
  const spacingClasses = {
    tight: 'gap-1',
    normal: 'gap-2',
    loose: 'gap-4'
  };

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around'
  };

  return (
    <div 
      className={cn(
        'flex items-center min-w-0',
        wrap && 'flex-wrap',
        spacingClasses[spacing],
        justifyClasses[justify],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}