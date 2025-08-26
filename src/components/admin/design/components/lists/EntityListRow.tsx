import React, { forwardRef, KeyboardEvent, MouseEvent } from 'react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

interface EntityMeta {
  label: string;
  value: string;
  className?: string;
}

interface EntityBadge {
  label: string;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
}

interface EntityListRowProps {
  // Content
  subject: string;
  preview?: string;
  meta?: EntityMeta[];
  metadata?: EntityMeta[];  // Add for compatibility
  badges?: EntityBadge[];
  timestamp?: string;       // Add for compatibility
  
  // Leading element (avatar or icon)
  leading?: React.ReactNode;
  avatar?: {
    src?: string;
    fallback: string;
    alt?: string;
  };
  
  // State and interaction
  selected?: boolean;
  isSelected?: boolean;     // Add for compatibility
  onClick?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLElement>) => void;
  href?: string;
  
  // Styling
  className?: string;
  contentClassName?: string;
  
  // Accessibility
  'aria-label'?: string;
  'aria-describedby'?: string;
}

export const EntityListRow = forwardRef<HTMLElement, EntityListRowProps>(
  ({
    subject,
    preview,
    meta = [],
    metadata = [],        // Add for compatibility
    badges = [],
    timestamp,            // Add for compatibility
    leading,
    avatar,
    selected = false,
    isSelected = false,   // Add for compatibility
    onClick,
    onKeyDown,
    href,
    className,
    contentClassName,
    'aria-label': ariaLabel,
    'aria-describedby': ariaDescribedBy,
    ...props
  }, ref) => {
    
    // Use isSelected or selected for compatibility
    const isCurrentlySelected = isSelected || selected;
    
    // Combine meta and metadata arrays
    const allMeta = [...meta, ...metadata];
    
    // Add timestamp to meta if provided
    if (timestamp) {
      allMeta.push({ label: 'Time', value: timestamp });
    }
    
    const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
      // Support Enter and Space for activation
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onClick?.();
      }
      onKeyDown?.(event);
    };

    const renderLeading = () => {
      if (leading) return leading;
      
      if (avatar) {
        return (
          <Avatar className="h-8 w-8 flex-shrink-0">
            <AvatarImage src={avatar.src} alt={avatar.alt} />
            <AvatarFallback className="text-xs bg-muted text-muted-foreground">
              {avatar.fallback}
            </AvatarFallback>
          </Avatar>
        );
      }
      
      return null;
    };

    const Component = href ? 'a' : 'button';
    
    const commonProps = {
      ref: ref as any,
      className: cn(
        // Base styles
        "w-full text-left rounded-lg border transition-all duration-200",
        "px-3 py-3 flex items-start gap-3",
        
        // Interactive states
        "hover:bg-muted/50 focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        
        // Selected state
        isCurrentlySelected ? [
          "ring-2 ring-ring bg-card border-ring/20",
          "shadow-sm"
        ] : [
          "border-border bg-card/50"
        ],
        
        // Disabled state
        "disabled:opacity-50 disabled:cursor-not-allowed",
        
        className
      ),
      'aria-label': ariaLabel || `${subject}${preview ? `: ${preview}` : ''}`,
      'aria-describedby': ariaDescribedBy,
      ...props
    };

    const buttonProps = href ? 
      { 
        ...commonProps,
        href, 
        role: 'link' as const,
        onClick: onClick as any,
        onKeyDown: handleKeyDown as any
      } : 
      { 
        ...commonProps,
        type: 'button' as const,
        onClick: onClick,
        onKeyDown: handleKeyDown as any
      };

    return (
      <Component
        {...buttonProps}
      >
        {/* Leading element (avatar/icon) */}
        {renderLeading()}
        
        {/* Content area */}
        <div className={cn("flex-1 min-w-0 space-y-1", contentClassName)}>
          {/* Subject line */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-medium line-clamp-1 text-foreground">
              {subject}
            </h3>
            
            {/* Badges */}
            {badges.length > 0 && (
              <div className="flex items-center gap-1 flex-shrink-0">
                {badges.slice(0, 2).map((badge, index) => (
                  <Badge
                    key={index}
                    variant={badge.variant || 'default'}
                    className={cn("text-xs px-1.5 py-0.5 h-auto", badge.className)}
                  >
                    {badge.label}
                  </Badge>
                ))}
                {badges.length > 2 && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0.5 h-auto">
                    +{badges.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
          
          {/* Preview text */}
          {preview && (
            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
              {preview}
            </p>
          )}
          
          {/* Meta information */}
          {allMeta.length > 0 && (
            <>
              <Separator className="my-1.5" />
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {allMeta.map((item, index) => (
                  <div
                    key={index}
                    className={cn("flex items-center gap-1", item.className)}
                    title={`${item.label}: ${item.value}`}
                  >
                    <span className="font-medium">{item.label}:</span>
                    <span>{item.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </Component>
    );
  }
);

EntityListRow.displayName = 'EntityListRow';