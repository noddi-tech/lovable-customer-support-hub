import React from 'react';
import { VoiceProvider, useVoice } from '@/contexts/VoiceContext';
import { StandardThreePanelLayout } from '@/components/layout/StandardThreePanelLayout';
import { VoiceHeader } from './voice/VoiceHeader';
import { VoiceSidebar } from './voice/VoiceSidebar';
import { CallListView } from './voice/CallListView';
import { CallDetailView } from './voice/CallDetailView';

const VoiceInterfaceContent = () => {
  const { state, selectCall, selectSection } = useVoice();

  const handleBack = () => {
    selectCall(null);
  };

  return (
    <StandardThreePanelLayout
      storageKey="voice-interface"
      header={<VoiceHeader />}
      sidebar={
        <VoiceSidebar 
          selectedSection={state.selectedSection}
          onSectionChange={selectSection}
        />
      }
      listView={<CallListView />}
      detailView={
        state.selectedCallId ? (
          <CallDetailView callId={state.selectedCallId} />
        ) : null
      }
      showDetailView={!!state.selectedCallId}
      onBack={handleBack}
    />
  );
};

// Main VoiceInterface component with provider wrapper
export const VoiceInterface = () => {
  return (
    <VoiceProvider>
      <VoiceInterfaceContent />
    </VoiceProvider>
  );
};