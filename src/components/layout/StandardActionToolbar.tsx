import React, { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-responsive';

interface ActionGroup {
  id: string;
  actions: {
    id: string;
    icon?: React.ComponentType<{ className?: string }>;
    label: string;
    onClick: () => void;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    disabled?: boolean;
    shortcut?: string;
  }[];
}

interface StandardActionToolbarProps {
  title?: string;
  breadcrumbs?: { label: string; onClick?: () => void }[];
  showBackButton?: boolean;
  onBack?: () => void;
  actionGroups?: ActionGroup[];
  rightContent?: ReactNode;
  className?: string;
}

export const StandardActionToolbar: React.FC<StandardActionToolbarProps> = ({
  title,
  breadcrumbs = [],
  showBackButton = false,
  onBack,
  actionGroups = [],
  rightContent,
  className
}) => {
  const isMobile = useIsMobile();

  const renderBreadcrumbs = () => {
    if (breadcrumbs.length === 0 && !title) return null;

    return (
      <div className="flex items-center space-x-2 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={index}>
            {crumb.onClick ? (
              <button 
                onClick={crumb.onClick}
                className="text-muted-foreground hover:text-foreground transition-colors story-link"
              >
                {crumb.label}
              </button>
            ) : (
              <span className="text-muted-foreground">{crumb.label}</span>
            )}
            {index < breadcrumbs.length - 1 && (
              <span className="text-muted-foreground">/</span>
            )}
          </React.Fragment>
        ))}
        {title && breadcrumbs.length > 0 && (
          <>
            <span className="text-muted-foreground">/</span>
            <span className="text-foreground font-medium">{title}</span>
          </>
        )}
        {title && breadcrumbs.length === 0 && (
          <span className="text-foreground font-medium">{title}</span>
        )}
      </div>
    );
  };

  const renderActions = () => {
    if (actionGroups.length === 0) return null;

    if (isMobile) {
      // On mobile, show only primary actions and a "more" button
      const primaryActions = actionGroups[0]?.actions.slice(0, 2) || [];
      const hasMore = actionGroups.some(group => group.actions.length > 2) || actionGroups.length > 1;

      return (
        <div className="flex items-center space-x-2">
          {primaryActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant={action.variant || 'outline'}
                size="sm"
                onClick={action.onClick}
                disabled={action.disabled}
                className="h-8"
              >
                {Icon && <Icon className="h-4 w-4" />}
                <span className="sr-only">{action.label}</span>
              </Button>
            );
          })}
          {hasMore && (
            <Button variant="outline" size="sm" className="h-8">
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">More actions</span>
            </Button>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-1">
        {actionGroups.map((group, groupIndex) => (
          <React.Fragment key={group.id}>
            {group.actions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.id}
                  variant={action.variant || 'outline'}
                  size="sm"
                  onClick={action.onClick}
                  disabled={action.disabled}
                  className="h-8 transition-all duration-200 hover-scale"
                  title={action.shortcut ? `${action.label} (${action.shortcut})` : action.label}
                >
                  {Icon && <Icon className="h-4 w-4" />}
                  {!isMobile && <span className="ml-1">{action.label}</span>}
                </Button>
              );
            })}
            {groupIndex < actionGroups.length - 1 && (
              <Separator orientation="vertical" className="h-6 mx-2" />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className={cn(
      "flex items-center justify-between p-4 border-b border-border bg-card/50 backdrop-blur-sm",
      "min-h-[60px]", 
      className
    )}>
      <div className="flex items-center space-x-3 min-w-0 flex-1">
        {showBackButton && onBack && (
          <Button
            variant="ghost"
            size="sm" 
            onClick={onBack}
            className="h-8 w-8 p-0 hover-scale"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Go back</span>
          </Button>
        )}
        
        <div className="min-w-0 flex-1">
          {renderBreadcrumbs()}
        </div>
      </div>

      <div className="flex items-center space-x-3 shrink-0">
        {renderActions()}
        {rightContent && (
          <>
            {actionGroups.length > 0 && (
              <Separator orientation="vertical" className="h-6" />
            )}
            {rightContent}
          </>
        )}
      </div>
    </div>
  );
};