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
      spacing = '4',
      fullWidth = false,
    } = props;

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
    equalWidth = false,
    justifyContent = 'start',
    spacing = '1',
  } = props;

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

  const sizeClasses = useMemo(() => {
    const sizeMap = {
      sm: 'text-xs h-8 px-2',
      md: 'text-sm h-9 px-3',
      lg: 'text-base h-10 px-4'
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
              'flex flex-wrap w-full',
              orientationClass,
              spacingClass,
              justifyClass,
              variantClasses.list,
              child.props.className
            ),
            equalWidth,
            size,
            variant,
            triggerClassName: variantClasses.trigger
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
    const sizeClasses = useMemo(() => {
      const sizeMap = {
        sm: 'text-xs h-8 px-2',
        md: 'text-sm h-9 px-3',
        lg: 'text-base h-10 px-4'
      };
      return sizeMap[size];
    }, [size]);

    return (
      <TabsList ref={ref} className={className} {...props}>
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child) && child.type === ResponsiveTabsTrigger) {
            return React.cloneElement(child as React.ReactElement<ResponsiveTabsTriggerProps>, {
              className: cn(
                sizeClasses,
                equalWidth && 'flex-1',
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
    return (
      <TabsTrigger ref={ref} className={className} {...props}>
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