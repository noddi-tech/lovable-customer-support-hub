import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Phone, 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  LayoutGrid, 
  List, 
  ArrowLeft,
  Settings,
  Plus
} from 'lucide-react';
import { useVoice } from '@/contexts/VoiceContext';
import { useCalls } from '@/hooks/useCalls';
import { RealTimeIndicator } from './RealTimeIndicator';
import { cn } from '@/lib/utils';

interface VoiceHeaderProps {
  onRefresh?: () => void;
  onAddNote?: () => void;
  onExport?: () => void;
}

export const VoiceHeader: React.FC<VoiceHeaderProps> = ({ 
  onRefresh, 
  onAddNote, 
  onExport 
}) => {
  const { state, setFilters, setViewMode, selectCall, selectSection } = useVoice();
  const { activeCalls, calls } = useCalls();

  const getSectionTitle = (section: string) => {
    const titles = {
      'ongoing-calls': 'Active Calls',
      'callbacks-pending': 'Pending Callback Requests',
      'callbacks-assigned': 'Assigned Callback Requests', 
      'callbacks-closed': 'Completed Callback Requests',
      'callbacks-all': 'All Callback Requests',
      'voicemails-pending': 'Pending Voicemails',
      'voicemails-assigned': 'Assigned Voicemails',
      'voicemails-closed': 'Completed Voicemails', 
      'voicemails-all': 'All Voicemails',
      'calls-today': 'Today\'s Calls',
      'calls-yesterday': 'Yesterday\'s Calls',
      'calls-all': 'All Calls',
      'events-log': 'Call Events Log'
    };
    return titles[section] || 'Voice Monitor';
  };

  const getItemCount = () => {
    switch (state.selectedSection) {
      case 'ongoing-calls':
        return activeCalls?.length || 0;
      case 'calls-today':
      case 'calls-yesterday':
      case 'calls-all':
        return calls?.length || 0;
      default:
        return 0;
    }
  };

  const handleSearch = (value: string) => {
    setFilters({ searchQuery: value });
  };

  return (
    <div className="flex flex-col gap-4 p-4 border-b border-border bg-card/80 backdrop-blur-sm">
      {/* Top Row - Title and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {state.selectedCallId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => selectCall(null)}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-semibold">
              {state.selectedCallId ? 'Call Details' : getSectionTitle(state.selectedSection)}
            </h1>
            {!state.selectedCallId && (
              <Badge variant="secondary" className="ml-2">
                {getItemCount()}
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Real-time indicator */}
          <RealTimeIndicator onRefresh={onRefresh} />

          {/* Action buttons */}
          {!state.selectedCallId && (
            <>
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
                variant="outline"
                size="sm"
                onClick={onAddNote}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Quick Note
              </Button>
            </>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => selectSection('settings')}
            className="p-2"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Second Row - Search and Filters (only when not viewing call details) */}
      {!state.selectedCallId && (
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search calls, numbers, or notes..."
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