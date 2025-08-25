import React, { useState, useCallback } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ResponsiveTabs, ResponsiveTabsList, ResponsiveTabsTrigger, ResponsiveTabsContent } from '@/components/admin/design/components/layouts';
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/components/ui/resizable';
import { 
  Type, 
  Image, 
  MousePointer2, 
  Minus, 
  Space, 
  Columns3, 
  Share2, 
  Package, 
  Ticket,
  Code,
  Undo,
  Redo,
  Eye,
  Save,
  Send,
  Calendar,
  Download,
  Smartphone,
  Monitor,
  Moon,
  Sun
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile, useIsTablet, useIsDesktop } from '@/hooks/use-responsive';
import { useResizablePanels } from '@/hooks/useResizablePanels';
import { NewsletterCanvas } from './newsletter/NewsletterCanvas';
import { ScrollArea } from "@/components/ui/scroll-area";
import { BlocksPalette } from './newsletter/BlocksPalette';
import { PropertiesPanel } from './newsletter/PropertiesPanel';
import { PreviewDialog } from './newsletter/PreviewDialog';
import { TemplateLibrary } from './newsletter/TemplateLibrary';
import { GlobalStylesPanel } from './newsletter/GlobalStylesPanel';
import { PersonalizationPanel } from './newsletter/PersonalizationPanel';
import { SaveDraftDialog } from './newsletter/SaveDraftDialog';
import { ScheduleDialog } from './newsletter/ScheduleDialog';
import { useNewsletterStore } from './newsletter/useNewsletterStore';

export interface NewsletterBlock {
  id: string;
  type: 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'columns' | 'social' | 'product' | 'ticket' | 'html';
  content: any;
  styles: any;
}

const NewsletterBuilder = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const isTablet = useIsTablet();
  const isDesktop = useIsDesktop();
  
  // Panel persistence
  const { getPanelSize, updatePanelSize, resetPanelSizes } = useResizablePanels({
    storageKey: 'newsletter-builder',
    defaultSizes: {
      leftSidebar: isTablet ? 30 : 25,
      canvas: isTablet ? 45 : 50,
      rightSidebar: isTablet ? 25 : 25
    },
    minSizes: {
      leftSidebar: 20,
      canvas: 30,
      rightSidebar: 20
    },
    maxSizes: {
      leftSidebar: 40,
      canvas: 70,
      rightSidebar: 40
    }
  });
  
  const {
    blocks,
    selectedBlockId,
    globalStyles,
    canUndo,
    canRedo,
    addBlock,
    selectBlock,
    undo,
    redo,
    clearNewsletter
  } = useNewsletterStore();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [showPreview, setShowPreview] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSaveDraft, setShowSaveDraft] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [activeRightPanel, setActiveRightPanel] = useState<'properties' | 'global' | 'personalization'>('properties');

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveId(null);
    // Handle drag end logic here - reordering blocks
  }, []);

  const handleTestEmail = useCallback(() => {
    toast({
      title: "Test Email",
      description: "Test email functionality will be implemented soon",
    });
  }, [toast]);

  const handleExportHTML = useCallback(() => {
    toast({
      title: "Export HTML",
      description: "HTML export functionality will be implemented soon",
    });
  }, [toast]);

  return (
    <div className="app-root flex flex-col bg-background">
      {/* Top Toolbar */}
      <div className="app-header border-b bg-card px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
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
          <Separator orientation="vertical" className="h-6" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(true)}
            className="h-8 gap-2"
          >
            <Eye className="h-4 w-4" />
            {t('preview')}
          </Button>
          <div className="flex rounded-md border overflow-hidden">
            <Button
              variant={previewDevice === 'desktop' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPreviewDevice('desktop')}
              className="h-8 rounded-none"
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              variant={previewDevice === 'mobile' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setPreviewDevice('mobile')}
              className="h-8 rounded-none"
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="h-8"
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={resetPanelSizes}
            className="h-8 gap-2"
            title="Reset panel layout"
          >
            Reset Layout
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSaveDraft(true)}
            className="h-8 gap-2"
          >
            <Save className="h-4 w-4" />
            {t('saveDraft')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleTestEmail}
            className="h-8 gap-2"
          >
            <Send className="h-4 w-4" />
            {t('sendTest')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportHTML}
            className="h-8 gap-2"
          >
            <Download className="h-4 w-4" />
            {t('exportHTML')}
          </Button>
          <Separator orientation="vertical" className="h-6" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSchedule(true)}
            className="h-8 gap-2"
          >
            <Calendar className="h-4 w-4" />
            {t('schedule')}
          </Button>
          <Button
            variant="default"
            size="sm"
            className="h-8 gap-2"
          >
            <Send className="h-4 w-4" />
            {t('send')}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="app-main flex">
        {isMobile ? (
          // Mobile: Tabs-based layout without resizing
          <ResponsiveTabs defaultValue="canvas" variant="borderless" size="md" equalWidth className="flex-1 flex flex-col">
            <ResponsiveTabsList className="rounded-none border-b bg-card">
              <ResponsiveTabsTrigger value="blocks">{t('blocks')}</ResponsiveTabsTrigger>
              <ResponsiveTabsTrigger value="canvas">{t('canvas')}</ResponsiveTabsTrigger>
              <ResponsiveTabsTrigger value="properties">{t('properties')}</ResponsiveTabsTrigger>
            </ResponsiveTabsList>
            <ResponsiveTabsContent value="blocks" className="flex-1 m-0 min-h-0">
              <div className="pane">
                <ResponsiveTabs defaultValue="blocks" variant="compact" size="sm" equalWidth className="h-full flex flex-col">
                  <ResponsiveTabsList className="rounded-none border-b">
                    <ResponsiveTabsTrigger value="blocks">{t('blocks')}</ResponsiveTabsTrigger>
                    <ResponsiveTabsTrigger value="templates">{t('templates')}</ResponsiveTabsTrigger>
                  </ResponsiveTabsList>
                  <ResponsiveTabsContent value="blocks" className="flex-1 m-0 min-h-0">
                    <BlocksPalette onAddBlock={addBlock} />
                  </ResponsiveTabsContent>
                  <ResponsiveTabsContent value="templates" className="flex-1 m-0 min-h-0">
                    <TemplateLibrary />
                  </ResponsiveTabsContent>
                </ResponsiveTabs>
              </div>
            </ResponsiveTabsContent>
            <ResponsiveTabsContent value="canvas" className="flex-1 m-0 min-h-0">
              <DndContext
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                  <NewsletterCanvas
                    blocks={blocks}
                    selectedBlockId={selectedBlockId}
                    onSelectBlock={selectBlock}
                    previewDevice={previewDevice}
                    isDarkMode={isDarkMode}
                    globalStyles={globalStyles}
                  />
                </SortableContext>
                <DragOverlay>
                  {activeId ? (
                    <div className="bg-card border rounded-lg p-4 shadow-lg">
                      {t('dragging')}...
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </ResponsiveTabsContent>
            <ResponsiveTabsContent value="properties" className="flex-1 m-0 min-h-0">
              <ResponsiveTabs value={activeRightPanel} onValueChange={(value) => setActiveRightPanel(value as any)} variant="compact" size="sm" equalWidth className="h-full flex flex-col">
                <ResponsiveTabsList className="rounded-none border-b">
                  <ResponsiveTabsTrigger value="properties" className="text-xs">{t('properties')}</ResponsiveTabsTrigger>
                  <ResponsiveTabsTrigger value="global" className="text-xs">{t('global')}</ResponsiveTabsTrigger>
                  <ResponsiveTabsTrigger value="personalization" className="text-xs">{t('personalization')}</ResponsiveTabsTrigger>
                </ResponsiveTabsList>
                <ResponsiveTabsContent value="properties" className="flex-1 m-0 min-h-0">
                  <PropertiesPanel selectedBlockId={selectedBlockId} />
                </ResponsiveTabsContent>
                <ResponsiveTabsContent value="global" className="flex-1 m-0 min-h-0">
                  <GlobalStylesPanel />
                </ResponsiveTabsContent>
                <ResponsiveTabsContent value="personalization" className="flex-1 m-0 min-h-0">
                  <PersonalizationPanel />
                </ResponsiveTabsContent>
              </ResponsiveTabs>
            </ResponsiveTabsContent>
          </ResponsiveTabs>
        ) : (
          // Desktop/Tablet: Resizable panels
          <ResizablePanelGroup direction="horizontal" className="flex-1">
            {/* Left Sidebar - Blocks */}
            <ResizablePanel 
              defaultSize={getPanelSize('leftSidebar')}
              minSize={20}
              maxSize={40}
              onResize={(size) => updatePanelSize('leftSidebar', size)}
              className="border-r bg-card"
            >
              <ResponsiveTabs defaultValue="blocks" variant="compact" size="sm" equalWidth className="h-full flex flex-col">
                <ResponsiveTabsList className="rounded-none border-b">
                  <ResponsiveTabsTrigger value="blocks">{t('blocks')}</ResponsiveTabsTrigger>
                  <ResponsiveTabsTrigger value="templates">{t('templates')}</ResponsiveTabsTrigger>
                </ResponsiveTabsList>
                <ResponsiveTabsContent value="blocks" className="flex-1 m-0 min-h-0">
                  <div className="pane">
                    <BlocksPalette onAddBlock={addBlock} />
                  </div>
                </ResponsiveTabsContent>
                <ResponsiveTabsContent value="templates" className="flex-1 m-0 min-h-0">
                  <div className="pane">
                    <TemplateLibrary />
                  </div>
                </ResponsiveTabsContent>
              </ResponsiveTabs>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Center Canvas */}
            <ResizablePanel 
              defaultSize={getPanelSize('canvas')}
              minSize={30}
              onResize={(size) => updatePanelSize('canvas', size)}
              className="flex flex-col min-h-0"
            >
              <DndContext
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                  <NewsletterCanvas
                    blocks={blocks}
                    selectedBlockId={selectedBlockId}
                    onSelectBlock={selectBlock}
                    previewDevice={previewDevice}
                    isDarkMode={isDarkMode}
                    globalStyles={globalStyles}
                  />
                </SortableContext>
                <DragOverlay>
                  {activeId ? (
                    <div className="bg-card border rounded-lg p-4 shadow-lg">
                      {t('dragging')}...
                    </div>
                  ) : null}
                </DragOverlay>
              </DndContext>
            </ResizablePanel>

            <ResizableHandle withHandle />

            {/* Right Sidebar - Properties */}
            <ResizablePanel 
              defaultSize={getPanelSize('rightSidebar')}
              minSize={20}
              maxSize={40}
              onResize={(size) => updatePanelSize('rightSidebar', size)}
              className="border-l bg-card"
            >
              <ResponsiveTabs value={activeRightPanel} onValueChange={(value) => setActiveRightPanel(value as any)} variant="compact" size="sm" equalWidth className="h-full flex flex-col">
                <ResponsiveTabsList className="rounded-none border-b">
                  <ResponsiveTabsTrigger value="properties" className="text-xs">{t('properties')}</ResponsiveTabsTrigger>
                  <ResponsiveTabsTrigger value="global" className="text-xs">{t('global')}</ResponsiveTabsTrigger>
                  <ResponsiveTabsTrigger value="personalization" className="text-xs">{t('personalization')}</ResponsiveTabsTrigger>
                </ResponsiveTabsList>
                <ResponsiveTabsContent value="properties" className="flex-1 m-0 min-h-0">
                  <PropertiesPanel selectedBlockId={selectedBlockId} />
                </ResponsiveTabsContent>
                <ResponsiveTabsContent value="global" className="flex-1 m-0 min-h-0">
                  <GlobalStylesPanel />
                </ResponsiveTabsContent>
                <ResponsiveTabsContent value="personalization" className="flex-1 m-0 min-h-0">
                  <PersonalizationPanel />
                </ResponsiveTabsContent>
              </ResponsiveTabs>
            </ResizablePanel>
          </ResizablePanelGroup>
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
};

export default NewsletterBuilder;