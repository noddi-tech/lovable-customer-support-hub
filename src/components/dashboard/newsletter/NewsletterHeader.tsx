import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  LayoutGrid, 
  List, 
  ArrowLeft,
  Plus,
  Undo,
  Redo,
  Eye,
  Save,
  Send,
  Calendar,
  Smartphone,
  Monitor,
  Moon,
  Sun,
  MoreVertical
} from 'lucide-react';
import { useNewsletter } from '@/contexts/NewsletterContext';
import { useNewsletterStore } from './useNewsletterStore';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

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
  previewDevice = 'desktop',
  onPreviewDeviceChange,
  isDarkMode = false,
  onDarkModeChange
}) => {
  const { state, setFilters, setViewMode, selectNewsletter, createNewsletter } = useNewsletter();
  const { canUndo, canRedo, undo, redo } = useNewsletterStore();

  const getStatusTitle = () => {
    const statusTitles = {
      'all': 'All Newsletters',
      'draft': 'Draft Newsletters',
      'scheduled': 'Scheduled Newsletters',
      'sent': 'Sent Newsletters',
      'templates': 'Newsletter Templates'
    };
    return statusTitles[state.filters.status || 'all'];
  };

  const getItemCount = () => {
    if (state.selectedNewsletterId) return 1;
    return state.newsletters.filter(newsletter => {
      if (state.filters.status === 'all') return true;
      if (state.filters.status === 'templates') return newsletter.template;
      return newsletter.status === state.filters.status;
    }).length;
  };

  const handleSearch = (value: string) => {
    setFilters({ searchQuery: value });
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

  return (
    <div className="flex flex-col gap-4 p-4 border-b border-border bg-card/80 backdrop-blur-sm">
      {/* Top Row - Title and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {state.selectedNewsletterId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => selectNewsletter(null)}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">
              {state.selectedNewsletterId ? 'Newsletter Editor' : getStatusTitle()}
            </h1>
            {!state.selectedNewsletterId && (
              <Badge variant="secondary" className="ml-2">
                {getItemCount()}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {state.selectedNewsletterId ? (
            // Editor Actions
            <>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={undo}
                  disabled={!canUndo}
                  className="h-8"
                >
                  <Undo className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={redo}
                  disabled={!canRedo}
                  className="h-8"
                >
                  <Redo className="h-4 w-4" />
                </Button>
              </div>
              
              <Separator orientation="vertical" className="h-6" />
              
              <Button
                variant="outline"
                size="sm"
                onClick={onPreview}
                className="h-8 gap-2"
              >
                <Eye className="h-4 w-4" />
                Preview
              </Button>
              
              <div className="flex rounded-md border overflow-hidden">
                <Button
                  variant={previewDevice === 'desktop' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onPreviewDeviceChange?.('desktop')}
                  className="h-8 rounded-none"
                >
                  <Monitor className="h-4 w-4" />
                </Button>
                <Button
                  variant={previewDevice === 'mobile' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => onPreviewDeviceChange?.('mobile')}
                  className="h-8 rounded-none"
                >
                  <Smartphone className="h-4 w-4" />
                </Button>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onDarkModeChange?.(!isDarkMode)}
                className="h-8"
              >
                {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>
              
              <Separator orientation="vertical" className="h-6" />
              
              <Button
                variant="outline"
                size="sm"
                onClick={onSave}
                className="h-8 gap-2"
              >
                <Save className="h-4 w-4" />
                Save
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={onSchedule}
                className="h-8 gap-2"
              >
                <Calendar className="h-4 w-4" />
                Schedule
              </Button>
              
              <Button
                variant="default"
                size="sm"
                onClick={onSend}
                className="h-8 gap-2"
              >
                <Send className="h-4 w-4" />
                Send
              </Button>
            </>
          ) : (
            // List Actions
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={onExport}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </Button>

              <Button
                variant="default"
                size="sm"
                onClick={handleCreateNewsletter}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                New Newsletter
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="p-2"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Second Row - Search and Filters (only when not in editor mode) */}
      {!state.selectedNewsletterId && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search newsletters..."
                value={state.filters.searchQuery || ''}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
            </Button>
          </div>

          {/* View mode toggle */}
          <div className="flex items-center gap-1 bg-muted p-1 rounded-md">
            <Button
              variant={state.viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className={cn(
                "p-2 h-8",
                state.viewMode === 'list' && "bg-background shadow-sm"
              )}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={state.viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className={cn(
                "p-2 h-8",
                state.viewMode === 'grid' && "bg-background shadow-sm"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};