import React, { useState } from 'react';
import { NewsletterProvider, useNewsletter } from '@/contexts/NewsletterContext';
import { StandardThreePanelLayout } from '@/components/layout/StandardThreePanelLayout';
import { NewsletterHeader } from './NewsletterHeader';
import { NewsletterSidebar } from './NewsletterSidebar';
import { NewsletterListView } from './NewsletterListView';
import NewsletterBuilder from '../NewsletterBuilder';
import { PreviewDialog } from './PreviewDialog';
import { SaveDraftDialog } from './SaveDraftDialog';
import { ScheduleDialog } from './ScheduleDialog';
import { useNewsletterStore } from './useNewsletterStore';
import { useToast } from '@/hooks/use-toast';

const NewsletterInterfaceContent = () => {
  const { toast } = useToast();

  // Newsletter context
  const { state, selectNewsletter } = useNewsletter();

  // Newsletter store for editor
  const { blocks, globalStyles } = useNewsletterStore();

  const [selectedSection, setSelectedSection] = useState('all');
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSaveDraft, setShowSaveDraft] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  const handleRefresh = () => {
    toast({
      title: "Refreshed",
      description: "Newsletter list has been refreshed",
    });
  };

  const handleExport = () => {
    toast({
      title: "Export",
      description: "Export functionality will be implemented soon",
    });
  };

  const handlePreview = () => {
    setShowPreview(true);
  };

  const handleSave = () => {
    setShowSaveDraft(true);
  };

  const handleSend = () => {
    toast({
      title: "Send Newsletter",
      description: "Send functionality will be implemented soon",
    });
  };

  const handleSchedule = () => {
    setShowSchedule(true);
  };

  const handleBack = () => {
    selectNewsletter(null);
  };

  return (
    <>
      <StandardThreePanelLayout
        storageKey="newsletter-interface"
        header={
          <NewsletterHeader 
            onRefresh={handleRefresh}
            onExport={handleExport}
            onPreview={handlePreview}
            onSave={handleSave}
            onSend={handleSend}
            onSchedule={handleSchedule}
            previewDevice={previewDevice}
            onPreviewDeviceChange={setPreviewDevice}
            isDarkMode={isDarkMode}
            onDarkModeChange={setIsDarkMode}
          />
        }
        sidebar={
          <NewsletterSidebar 
            selectedSection={selectedSection}
            onSectionChange={setSelectedSection}
          />
        }
        listView={
          <NewsletterListView 
            newsletters={state.newsletters}
            isLoading={state.isLoading}
          />
        }
        detailView={<NewsletterBuilder />}
        showDetailView={!!state.selectedNewsletterId}
        onBack={handleBack}
      />
      
      {/* Dialogs */}
      <PreviewDialog
        open={showPreview}
        onOpenChange={setShowPreview}
        blocks={blocks}
        globalStyles={globalStyles}
        device={previewDevice}
        darkMode={isDarkMode}
      />
      
      <SaveDraftDialog
        open={showSaveDraft}
        onOpenChange={setShowSaveDraft}
      />
      
      <ScheduleDialog
        open={showSchedule}
        onOpenChange={setShowSchedule}
      />
    </>
  );
};

// Main NewsletterInterface component with provider wrapper
export const NewsletterInterface = () => {
  return (
    <NewsletterProvider>
      <NewsletterInterfaceContent />
    </NewsletterProvider>
  );
};