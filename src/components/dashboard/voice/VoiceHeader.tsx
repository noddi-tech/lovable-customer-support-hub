import React from 'react';
import { RefreshCw, Download, Settings, Filter, Phone, Plus } from 'lucide-react';
import { useVoice } from '@/contexts/VoiceContext';
import { StandardActionToolbar } from '@/components/layout/StandardActionToolbar';
import { useCalls } from '@/hooks/useCalls';
import { RealTimeIndicator } from './RealTimeIndicator';

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
  const { state, selectSection } = useVoice();
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

  const getBreadcrumbs = () => {
    const crumbs = [
      { label: 'Interactions', onClick: () => selectSection('nav') },
      { label: 'Voice' }
    ];

    if (state.selectedCallId) {
      crumbs.push({ label: 'Call Details' });
    }

    return crumbs;
  };

  const getTitle = () => {
    if (state.selectedCallId) {
      return 'Call Details';
    }
    return getSectionTitle(state.selectedSection);
  };

  const actionGroups = [
    {
      id: 'primary',
      actions: [
        {
          id: 'refresh',
          icon: RefreshCw,
          label: 'Refresh',
          onClick: onRefresh || (() => {}),
          shortcut: 'Ctrl+R'
        },
        ...(onExport ? [{
          id: 'export',
          icon: Download,
          label: 'Export',
          onClick: onExport,
          variant: 'outline' as const
        }] : []),
        ...(onAddNote ? [{
          id: 'add-note',
          icon: Plus,
          label: 'Quick Note',
          onClick: onAddNote,
          variant: 'outline' as const
        }] : [])
      ]
    },
    {
      id: 'secondary',
      actions: [
        {
          id: 'settings',
          icon: Settings,
          label: 'Settings',
          onClick: () => selectSection('settings'),
          variant: 'ghost' as const
        }
      ]
    }
  ];

  return (
    <StandardActionToolbar
      title={getTitle()}
      breadcrumbs={getBreadcrumbs()}
      showBackButton={!!state.selectedCallId}
      onBack={() => selectSection(state.selectedSection)}
      actionGroups={actionGroups}
      rightContent={<RealTimeIndicator onRefresh={onRefresh} />}
    />
  );
};