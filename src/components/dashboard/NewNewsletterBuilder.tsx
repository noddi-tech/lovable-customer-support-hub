import React, { useState, useCallback } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Settings,
  Palette,
  User
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';
import { Pane, PaneToolbar, PaneBody, Inspector } from '@/components/layout';
import { ResponsiveLayout } from '@/components/layout/ResponsiveLayout';
import { useResponsive } from '@/contexts/ResponsiveContext';
import { NewsletterCanvas } from './newsletter/NewsletterCanvas';
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

const NewNewsletterBuilder = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { showInspector, setShowInspector, isMobile } = useResponsive();
  const [isDarkMode, setIsDarkMode] = useState(false);
  
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

  // Blocks palette sidebar
  const blocksPaletteContent = (
    <Pane className="w-64 border-r">
      <PaneToolbar className="border-b p-4">
        <h3 className="font-semibold text-sm">{t('blocks')}</h3>
      </PaneToolbar>
      <PaneBody>
        <BlocksPalette onAddBlock={addBlock} />
      </PaneBody>
    </Pane>
  );

  // Main canvas area
  const canvasContent = (
    <Pane className="flex-1">
      <PaneToolbar className="flex items-center justify-between p-2 border-b sticky top-0 z-10">
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
          <Separator orientation="vertical" className="h-4" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(true)}
            className="h-8"
          >
            <Eye className="h-4 w-4 mr-2" />
            {t('preview')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPreviewDevice(previewDevice === 'desktop' ? 'mobile' : 'desktop')}
            className="h-8"
          >
            {previewDevice === 'desktop' ? (
              <Smartphone className="h-4 w-4" />
            ) : (
              <Monitor className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSaveDraft(true)}
            className="h-8"
          >
            <Save className="h-4 w-4 mr-2" />
            {t('save')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSchedule(true)}
            className="h-8"
          >
            <Calendar className="h-4 w-4 mr-2" />
            {t('schedule')}
          </Button>
          <Button
            size="sm"
            onClick={handleTestEmail}
            className="h-8"
          >
            <Send className="h-4 w-4 mr-2" />
            {t('send')}
          </Button>
        </div>
      </PaneToolbar>

      <PaneBody className="bg-muted/30 p-4">
        <div className="max-w-3xl mx-auto">
          <DndContext
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={blocks.map(block => block.id)}
              strategy={verticalListSortingStrategy}
            >
              <NewsletterCanvas
                blocks={blocks}
                selectedBlockId={selectedBlockId}
                onSelectBlock={selectBlock}
                previewDevice={previewDevice}
                globalStyles={globalStyles}
                isDarkMode={isDarkMode}
              />
            </SortableContext>
            <DragOverlay>
              {activeId ? <div>Dragging block {activeId}</div> : null}
            </DragOverlay>
          </DndContext>
        </div>
      </PaneBody>
    </Pane>
  );

  // Properties inspector
  const inspectorContent = (
    <div className="h-full flex flex-col">
      <div className="border-b p-4">
        <Tabs value={activeRightPanel} onValueChange={(value: any) => setActiveRightPanel(value)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="properties" className="text-xs">
              <Settings className="h-3 w-3 mr-1" />
              {!isMobile && t('properties')}
            </TabsTrigger>
            <TabsTrigger value="global" className="text-xs">
              <Palette className="h-3 w-3 mr-1" />
              {!isMobile && t('global')}
            </TabsTrigger>
            <TabsTrigger value="personalization" className="text-xs">
              <User className="h-3 w-3 mr-1" />
              {!isMobile && t('personalization')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeRightPanel} onValueChange={(value: any) => setActiveRightPanel(value)}>
          <TabsContent value="properties" className="h-full m-0">
            <PropertiesPanel selectedBlockId={selectedBlockId} />
          </TabsContent>
          <TabsContent value="global" className="h-full m-0">
            <GlobalStylesPanel />
          </TabsContent>
          <TabsContent value="personalization" className="h-full m-0">
            <PersonalizationPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );

  return (
    <div className="h-full flex bg-background">
      {/* Mobile layout */}
      {isMobile ? (
        <div className="flex-1 flex flex-col">
          {canvasContent}
        </div>
      ) : (
        <>
          {/* Blocks palette */}
          {blocksPaletteContent}
          
          {/* Main canvas */}
          <div className="flex-1 flex">
            {canvasContent}
            
            {/* Inspector */}
            {showInspector && (
              <div className="w-80 border-l">
                {inspectorContent}
              </div>
            )}
          </div>
        </>
      )}

      {/* Dialogs */}
      <PreviewDialog 
        open={showPreview} 
        onOpenChange={setShowPreview}
        blocks={blocks}
        globalStyles={globalStyles}
        device={previewDevice}
        darkMode={isDarkMode}
      />
      
      {/* Simplified dialogs without props for now */}
      {showTemplates && <div>Template Library Modal</div>}
      
      {showSaveDraft && <div>Save Draft Modal</div>}
      {showSchedule && <div>Schedule Modal</div>}
    </div>
  );
};

export default NewNewsletterBuilder;