import { cn } from '@/lib/utils';
import React, { useMemo, useCallback, forwardRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ResponsiveValue<T> = T | { sm?: T; md?: T; lg?: T; xl?: T };

// Legacy props for backward compatibility
interface TabItem {
  value: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  content: React.ReactNode;
}

interface LegacyResponsiveTabsProps {
  items: TabItem[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  orientation?: 'horizontal' | 'vertical' | 'responsive';
  breakpoint?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'pills' | 'underline' | 'borderless' | 'compact';
  spacing?: ResponsiveValue<string>;
  fullWidth?: boolean;
}

// New props for standard shadcn pattern
interface StandardResponsiveTabsProps {
  children: React.ReactNode;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  orientation?: 'horizontal' | 'vertical' | 'responsive';
  breakpoint?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'pills' | 'underline' | 'borderless' | 'compact';
  size?: 'sm' | 'md' | 'lg';
  equalWidth?: boolean;
  justifyContent?: 'start' | 'center' | 'end' | 'between';
  spacing?: ResponsiveValue<string>;
  scrollable?: boolean;
}

type ResponsiveTabsProps = LegacyResponsiveTabsProps | StandardResponsiveTabsProps;

// Helper function to check if props contain items (legacy API)
function isLegacyProps(props: ResponsiveTabsProps): props is LegacyResponsiveTabsProps {
  return 'items' in props;
}

export const ResponsiveTabs: React.FC<ResponsiveTabsProps> = React.memo((props) => {
  // Handle legacy API
  if (isLegacyProps(props)) {
    const {
      items,
      defaultValue,
      value,
      onValueChange,
      className,
      orientation = 'responsive',
      breakpoint = 'md',
      variant = 'default',
      spacing = '1',
      fullWidth = true, // Default to true for legacy API to fix uneven widths
    } = props;

    // Mobile-first responsive orientation
    const orientationClass = useMemo(() => orientation === 'responsive' 
      ? `flex-col md:flex-row` // Always mobile-first
      : orientation === 'vertical' 
        ? 'flex-col' 
        : 'flex-row', [orientation]);

    const spacingClass = useMemo(() => typeof spacing === 'string' 
      ? `gap-${spacing}` 
      : cn(
          spacing.sm && `sm:gap-${spacing.sm}`,
          spacing.md && `md:gap-${spacing.md}`,
          spacing.lg && `lg:gap-${spacing.lg}`,
          spacing.xl && `xl:gap-${spacing.xl}`
        ), [spacing]);

    const variantClasses = useMemo(() => {
      switch (variant) {
        case 'pills':
          return {
            list: 'bg-muted p-1 rounded-lg',
            trigger: 'rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm'
          };
        case 'underline':
          return {
            list: 'border-b bg-transparent',
            trigger: 'border-b-2 border-transparent data-[state=active]:border-primary rounded-none'
          };
        case 'borderless':
          return {
            list: 'bg-transparent',
            trigger: 'data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-md'
          };
        case 'compact':
          return {
            list: 'bg-muted/50 p-0.5 rounded',
            trigger: 'text-xs h-6 px-2 rounded-sm data-[state=active]:bg-background'
          };
        default:
          return {
            list: 'bg-muted rounded-md',
            trigger: 'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm'
          };
      }
    }, [variant]);

    // Override shadcn's inline-flex with flex for full-width layouts
    const tabsListClass = useMemo(() => cn(
      'flex flex-wrap w-full', // Override inline-flex, add flex-wrap for mobile overflow
      orientationClass,
      spacingClass,
      variantClasses.list
    ), [orientationClass, spacingClass, variantClasses.list]);

    const tabsTriggerClass = useMemo(() => cn(
      fullWidth && 'flex-1 min-w-0', // min-w-0 prevents text overflow
      variantClasses.trigger
    ), [fullWidth, variantClasses.trigger]);

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
                <item.icon className="w-4 h-4 mr-2 flex-shrink-0" />
              )}
              <span className="truncate">{item.label}</span>
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
  }

  // Handle new standard API
  const {
    children,
    defaultValue,
    value,
    onValueChange,
    className,
    orientation = 'responsive',
    breakpoint = 'md',
    variant = 'default',
    size = 'md',
    equalWidth = true, // Default to true to fix uneven widths
    justifyContent = 'start',
    spacing = '1',
    scrollable = false,
  } = props;

  // Mobile-first responsive orientation
  const orientationClass = useMemo(() => orientation === 'responsive' 
    ? `flex-col md:flex-row` // Always mobile-first
    : orientation === 'vertical' 
      ? 'flex-col' 
      : 'flex-row', [orientation]);

  const spacingClass = useMemo(() => typeof spacing === 'string' 
    ? `gap-${spacing}` 
    : cn(
        spacing.sm && `sm:gap-${spacing.sm}`,
        spacing.md && `md:gap-${spacing.md}`,
        spacing.lg && `lg:gap-${spacing.lg}`,
        spacing.xl && `xl:gap-${spacing.xl}`
      ), [spacing]);

  const sizeClasses = useMemo(() => {
    const sizeMap = {
      sm: 'text-xs h-8 px-2 py-1',
      md: 'text-sm h-9 px-3 py-1.5',
      lg: 'text-base h-10 px-4 py-2'
    };
    return sizeMap[size];
  }, [size]);

  const variantClasses = useMemo(() => {
    switch (variant) {
      case 'pills':
        return {
          list: 'bg-muted p-1 rounded-lg',
          trigger: 'rounded-md data-[state=active]:bg-background data-[state=active]:shadow-sm'
        };
      case 'underline':
        return {
          list: 'border-b bg-transparent',
          trigger: 'border-b-2 border-transparent data-[state=active]:border-primary rounded-none'
        };
      case 'borderless':
        return {
          list: 'bg-transparent',
          trigger: 'data-[state=active]:bg-accent data-[state=active]:text-accent-foreground rounded-md'
        };
      case 'compact':
        return {
          list: 'bg-muted/50 p-0.5 rounded',
          trigger: 'text-xs h-6 px-2 rounded-sm data-[state=active]:bg-background'
        };
      default:
        return {
          list: 'bg-muted rounded-md',
          trigger: 'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm'
        };
    }
  }, [variant]);

  const justifyClass = useMemo(() => {
    const justifyMap = {
      start: 'justify-start',
      center: 'justify-center',
      end: 'justify-end',
      between: 'justify-between'
    };
    return justifyMap[justifyContent];
  }, [justifyContent]);

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
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === ResponsiveTabsList) {
    return React.cloneElement(child as React.ReactElement<ResponsiveTabsListProps>, {
            className: cn(
              'flex flex-wrap w-full', // Override inline-flex, add flex-wrap
              scrollable && 'overflow-x-auto scrollbar-thin',
              orientationClass,
              spacingClass,
              justifyClass,
              variantClasses.list,
              child.props.className
            ),
            equalWidth,
            size,
            variant,
            triggerClassName: cn(sizeClasses, variantClasses.trigger)
          });
        }
        return child;
      })}
    </Tabs>
  );
});

// ResponsiveTabsList component
interface ResponsiveTabsListProps {
  children: React.ReactNode;
  className?: string;
  equalWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'pills' | 'underline' | 'borderless' | 'compact';
  triggerClassName?: string;
}

export const ResponsiveTabsList = forwardRef<HTMLDivElement, ResponsiveTabsListProps>(
  ({ children, className, equalWidth, size = 'md', variant, triggerClassName, ...props }, ref) => {
    return (
      <TabsList ref={ref} className={className} {...props}>
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child) && child.type === ResponsiveTabsTrigger) {
            return React.cloneElement(child as React.ReactElement<ResponsiveTabsTriggerProps>, {
              className: cn(
                equalWidth && 'flex-1 min-w-0', // min-w-0 prevents text overflow
                triggerClassName,
                child.props.className
              )
            });
          }
          return child;
        })}
      </TabsList>
    );
  }
);

// ResponsiveTabsTrigger component
interface ResponsiveTabsTriggerProps {
  children: React.ReactNode;
  value: string;
  className?: string;
  disabled?: boolean;
}

export const ResponsiveTabsTrigger = forwardRef<HTMLButtonElement, ResponsiveTabsTriggerProps>(
  ({ children, className, ...props }, ref) => {
    // Sanitize vertical layout classes from incoming className
    const sanitizedClassName = className
      ?.replace(/\bflex-col\b/g, "flex-row")
      .replace(/\bgrid\b/g, "inline-flex")
      .replace(/\bitems-start\b/g, "items-center");
      
    return (
      <TabsTrigger 
        ref={ref} 
        className={cn(
          "!inline-flex !flex-row !items-center gap-2 !whitespace-nowrap shrink-0 min-w-fit leading-none",
          sanitizedClassName
        )} 
        {...props}
      >
        {children}
      </TabsTrigger>
    );
  }
);

// ResponsiveTabsContent component
interface ResponsiveTabsContentProps {
  children: React.ReactNode;
  value: string;
  className?: string;
}

export const ResponsiveTabsContent = forwardRef<HTMLDivElement, ResponsiveTabsContentProps>(
  ({ children, className, ...props }, ref) => {
    return (
      <TabsContent ref={ref} className={cn('mt-4 focus-visible:outline-none', className)} {...props}>
        {children}
      </TabsContent>
    );
  }
);

ResponsiveTabsList.displayName = 'ResponsiveTabsList';
ResponsiveTabsTrigger.displayName = 'ResponsiveTabsTrigger';
ResponsiveTabsContent.displayName = 'ResponsiveTabsContent';