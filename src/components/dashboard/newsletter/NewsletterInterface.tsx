import React, { useState } from 'react';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { useIsMobile, useIsTablet, useIsDesktop } from '@/hooks/use-responsive';
import { useResizablePanels } from '@/hooks/useResizablePanels';
import { NewsletterProvider, useNewsletter } from '@/contexts/NewsletterContext';
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
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();
  const { toast } = useToast();

  // Newsletter context
  const { state, selectNewsletter } = useNewsletter();

  // Newsletter store for editor
  const { blocks, globalStyles } = useNewsletterStore();

  // Panel persistence
  const { getPanelSize, updatePanelSize } = useResizablePanels({
    storageKey: 'newsletter-interface',
    defaultSizes: {
      sidebar: isMobile ? 100 : isTablet ? 30 : 25,
      content: isMobile ? 100 : isTablet ? 35 : 40,
      editor: isMobile ? 100 : isTablet ? 35 : 35
    },
    minSizes: {
      sidebar: isMobile ? 100 : 20,
      content: isMobile ? 100 : 30,
      editor: isMobile ? 100 : 25
    },
    maxSizes: {
      sidebar: isMobile ? 100 : 50,
      content: isMobile ? 100 : 60,
      editor: isMobile ? 100 : 50
    }
  });

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

  const enableResizing = isDesktop || isTablet;

  if (isMobile) {
    // Mobile: Show either sidebar/list or editor based on selection
    return (
      <div className="app-root bg-gradient-surface flex flex-col h-screen">
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
        
        <div className="app-main bg-gradient-surface flex-1 min-h-0">
          {state.selectedNewsletterId ? (
            // Show newsletter editor
            <div className="h-full">
              <NewsletterBuilder />
            </div>
          ) : selectedSection === 'nav' ? (
            // Show navigation sidebar
            <div className="nav-pane border-r border-border bg-card/80 backdrop-blur-sm shadow-surface h-full">
              <NewsletterSidebar 
                selectedSection={selectedSection}
                onSectionChange={setSelectedSection}
              />
            </div>
          ) : (
            // Show newsletter list
            <div className="detail-pane flex flex-col bg-gradient-surface h-full">
              <div className="p-4">
                <NewsletterListView 
                  newsletters={state.newsletters}
                  isLoading={state.isLoading}
                />
              </div>
            </div>
          )}
        </div>
        
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
      </div>
    );
  }

  // Desktop & Tablet: Three-panel layout
  return (
    <div className="app-root bg-gradient-surface flex flex-col h-screen">
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
      
      <div className="app-main bg-gradient-surface flex-1 min-h-0">
        <ResizablePanelGroup direction="horizontal" className="h-full">
          {/* Sidebar Panel */}
          <ResizablePanel 
            defaultSize={getPanelSize('sidebar')}
            minSize={20}
            maxSize={50}
            onResize={(size) => updatePanelSize('sidebar', size)}
            className="border-r border-border bg-card/80 backdrop-blur-sm shadow-surface"
          >
            <NewsletterSidebar 
              selectedSection={selectedSection}
              onSectionChange={setSelectedSection}
            />
          </ResizablePanel>

          {enableResizing && <ResizableHandle withHandle />}

          {/* Content Panel - Newsletter List or Editor */}
          {state.selectedNewsletterId ? (
            // Newsletter Editor Mode
            <ResizablePanel 
              defaultSize={getPanelSize('editor')}
              minSize={30}
              onResize={(size) => updatePanelSize('editor', size)}
              className="flex flex-col bg-gradient-surface"
            >
              <NewsletterBuilder />
            </ResizablePanel>
          ) : (
            // Newsletter List Mode
            <ResizablePanel 
              defaultSize={getPanelSize('content')}
              minSize={30}
              maxSize={70}
              onResize={(size) => updatePanelSize('content', size)}
              className="flex flex-col bg-gradient-surface"
            >
              <div className="flex-1 min-h-0 p-4">
                <NewsletterListView 
                  newsletters={state.newsletters}
                  isLoading={state.isLoading}
                />
              </div>
            </ResizablePanel>
          )}
        </ResizablePanelGroup>
      </div>
      
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
    </div>
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