import React, { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-responsive';

interface DetailSection {
  id: string;
  title: string;
  content: ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

interface DetailAction {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  disabled?: boolean;
}

interface StandardDetailViewProps {
  title: string;
  subtitle?: string;
  status?: {
    label: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  metadata?: Array<{
    label: string;
    value: ReactNode;
  }>;
  actions?: DetailAction[];
  sections: DetailSection[];
  onBack?: () => void;
  showBackButton?: boolean;
  className?: string;
  headerContent?: ReactNode;
}

export const StandardDetailView: React.FC<StandardDetailViewProps> = ({
  title,
  subtitle,
  status,
  metadata = [],
  actions = [],
  sections,
  onBack,
  showBackButton = true,
  className,
  headerContent
}) => {
  const isMobile = useIsMobile();

  const renderActions = () => {
    if (actions.length === 0) return null;

    if (isMobile && actions.length > 2) {
      // On mobile, show first 2 actions and a "more" button
      const primaryActions = actions.slice(0, 2);
      
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
          <Button variant="outline" size="sm" className="h-8">
            <MoreHorizontal className="h-4 w-4" />
            <span className="sr-only">More actions</span>
          </Button>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-2 flex-wrap">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.id}
              variant={action.variant || 'outline'}
              size="sm"
              onClick={action.onClick}
              disabled={action.disabled}
              className="h-8 transition-all duration-200 hover-scale"
            >
              {Icon && <Icon className="h-4 w-4" />}
              {!isMobile && <span className="ml-1">{action.label}</span>}
            </Button>
          );
        })}
      </div>
    );
  };

  const renderMetadata = () => {
    if (metadata.length === 0) return null;

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/20 rounded-lg">
        {metadata.map((item, index) => (
          <div key={index} className="space-y-1">
            <dt className="text-sm font-medium text-muted-foreground">
              {item.label}
            </dt>
            <dd className="text-sm text-foreground">
              {item.value}
            </dd>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={cn("flex flex-col h-full bg-background animate-fade-in", className)}>
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="space-y-4">
          {/* Title Row */}
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 min-w-0 flex-1">
              {showBackButton && onBack && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onBack}
                  className="h-8 w-8 p-0 shrink-0 hover-scale"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="sr-only">Go back</span>
                </Button>
              )}
              
              <div className="min-w-0 flex-1">
                <div className="flex items-center space-x-2 flex-wrap">
                  <h1 className="text-lg font-semibold text-foreground truncate">
                    {title}
                  </h1>
                  {status && (
                    <Badge variant={status.variant || 'secondary'}>
                      {status.label}
                    </Badge>
                  )}
                </div>
                {subtitle && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            <div className="shrink-0">
              {renderActions()}
            </div>
          </div>

          {/* Header Content */}
          {headerContent && (
            <div>
              {headerContent}
            </div>
          )}

          {/* Metadata */}
          {renderMetadata()}
        </div>
      </div>

      {/* Content Sections */}
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="p-4 space-y-6">
          {sections.map((section, index) => (
            <div key={section.id} className="space-y-3">
              {index > 0 && <Separator />}
              
              <div className="flex items-center justify-between">
                <h2 className="text-base font-medium text-foreground">
                  {section.title}
                </h2>
              </div>
              
              <div className="animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>
                {section.content}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};