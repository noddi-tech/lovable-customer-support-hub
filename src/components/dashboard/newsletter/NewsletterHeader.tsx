import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { RefreshCw, Download, Eye, Save, Send, Calendar, Monitor, Smartphone, Moon, Sun, Undo, Redo, Plus } from 'lucide-react';
import { StandardActionToolbar } from '@/components/layout/StandardActionToolbar';
import { useNewsletter } from '@/contexts/NewsletterContext';
import { useNewsletterStore } from './useNewsletterStore';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-responsive';

interface NewsletterHeaderProps {
  onRefresh?: () => void;
  onExport?: () => void;
  onPreview?: () => void;
  onSave?: () => void;
  onSend?: () => void;
  onSchedule?: () => void;
  previewDevice?: 'desktop' | 'mobile';
  onPreviewDeviceChange?: (device: 'desktop' | 'mobile') => void;
  isDarkMode?: boolean;
  onDarkModeChange?: (isDarkMode: boolean) => void;
}

export const NewsletterHeader: React.FC<NewsletterHeaderProps> = ({
  onRefresh,
  onExport,
  onPreview,
  onSave,
  onSend,
  onSchedule,
  previewDevice,
  onPreviewDeviceChange,
  isDarkMode,
  onDarkModeChange
}) => {
  const isMobile = useIsMobile();
  const { state, selectNewsletter, createNewsletter } = useNewsletter();
  const { canUndo, canRedo, undo, redo } = useNewsletterStore();

  const getBreadcrumbs = () => {
    const crumbs = [
      { label: 'Marketing', onClick: () => selectNewsletter(null) },
      { label: 'Newsletters' }
    ];

    if (state.selectedNewsletterId) {
      // Find the selected newsletter name
      const newsletter = state.newsletters.find(n => n.id === state.selectedNewsletterId);
      crumbs.push({ label: newsletter?.title || 'Untitled Newsletter' });
    }

    return crumbs;
  };

  const getTitle = () => {
    if (state.selectedNewsletterId) {
      const newsletter = state.newsletters.find(n => n.id === state.selectedNewsletterId);
      return newsletter?.title || 'Untitled Newsletter';
    }
    return undefined;
  };

  const handleCreateNewsletter = () => {
    createNewsletter({
      title: 'Untitled Newsletter',
      description: '',
      status: 'draft',
      blocks: [],
      global_styles: {
        primaryColor: '#007aff',
        secondaryColor: '#5856d6',
        fontFamily: 'system-ui, sans-serif',
        fontSize: '16px',
        backgroundColor: '#ffffff',
        maxWidth: '600px'
      }
    });
  };

  const getPreviewControls = () => (
    <div className="flex items-center space-x-2">
      {!isMobile && onPreviewDeviceChange && (
        <>
          <Select value={previewDevice} onValueChange={onPreviewDeviceChange}>
            <SelectTrigger className="w-[120px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desktop">
                <div className="flex items-center">
                  <Monitor className="h-4 w-4 mr-2" />
                  Desktop
                </div>
              </SelectItem>
              <SelectItem value="mobile">
                <div className="flex items-center">
                  <Smartphone className="h-4 w-4 mr-2" />
                  Mobile
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {onDarkModeChange && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDarkModeChange(!isDarkMode)}
              className="h-8 w-8 p-0"
            >
              {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </Button>
          )}
        </>
      )}
    </div>
  );

  const actionGroups = [];

  if (state.selectedNewsletterId) {
    // Editor mode actions
    actionGroups.push(
      {
        id: 'editor',
        actions: [
          {
            id: 'undo',
            icon: Undo,
            label: 'Undo',
            onClick: undo,
            disabled: !canUndo,
            variant: 'outline' as const
          },
          {
            id: 'redo',
            icon: Redo,
            label: 'Redo',
            onClick: redo,
            disabled: !canRedo,
            variant: 'outline' as const
          }
        ]
      },
      {
        id: 'preview',
        actions: [
          {
            id: 'preview',
            icon: Eye,
            label: 'Preview',
            onClick: onPreview || (() => {}),
            variant: 'outline' as const
          }
        ]
      },
      {
        id: 'actions',
        actions: [
          {
            id: 'save',
            icon: Save,
            label: 'Save Draft',
            onClick: onSave || (() => {}),
            variant: 'outline' as const
          },
          {
            id: 'schedule',
            icon: Calendar,
            label: 'Schedule',
            onClick: onSchedule || (() => {}),
            variant: 'secondary' as const
          },
          {
            id: 'send',
            icon: Send,
            label: 'Send Now',
            onClick: onSend || (() => {}),
            variant: 'default' as const
          }
        ]
      }
    );
  } else {
    // List mode actions
    actionGroups.push(
      {
        id: 'primary',
        actions: [
          {
            id: 'refresh',
            icon: RefreshCw,
            label: 'Refresh',
            onClick: onRefresh || (() => {}),
            variant: 'outline' as const
          },
          {
            id: 'export',
            icon: Download,
            label: 'Export',
            onClick: onExport || (() => {}),
            variant: 'outline' as const
          },
          {
            id: 'create',
            icon: Plus,
            label: 'New Newsletter',
            onClick: handleCreateNewsletter,
            variant: 'default' as const
          }
        ]
      }
    );
  }

  return (
    <StandardActionToolbar
      title={getTitle()}
      breadcrumbs={getBreadcrumbs()}
      showBackButton={!!state.selectedNewsletterId}
      onBack={() => selectNewsletter(null)}
      actionGroups={actionGroups}
      rightContent={getPreviewControls()}
    />
  );
};