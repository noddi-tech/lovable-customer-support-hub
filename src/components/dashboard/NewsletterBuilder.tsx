import React, { useState, useCallback } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
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
import { CampaignBuilderShell } from './newsletter/CampaignBuilderShell';
import { PaneColumn } from './newsletter/PaneColumn';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PaneTabProbe } from '@/dev/PaneTabProbe';

export interface NewsletterBlock {
  id: string;
  type: 'text' | 'image' | 'button' | 'divider' | 'spacer' | 'columns' | 'social' | 'product' | 'ticket' | 'html';
  content: any;
  styles: any;
}

const NewsletterBuilder = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  
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
  const [activeLeftPanel, setActiveLeftPanel] = useState<'blocks' | 'templates'>('blocks');
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

  // Render the toolbar
  const renderToolbar = () => (
    <div className="px-4 py-2 flex items-center justify-between gap-2 min-w-0">
      <div className="control-toolbar flex-wrap min-w-0">
        <Button
          variant="outline"
          size="sm"
          onClick={undo}
          disabled={!canUndo}
          className="h-8 shrink-0"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={redo}
          disabled={!canRedo}
          className="h-8 shrink-0"
        >
          <Redo className="h-4 w-4" />
        </Button>
        <Separator orientation="vertical" className="h-6 shrink-0" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowPreview(true)}
          className="h-8 gap-2 shrink-0"
        >
          <Eye className="h-4 w-4" />
          {t('preview')}
        </Button>
        <div className="flex rounded-md border overflow-hidden shrink-0">
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
          className="h-8 shrink-0"
        >
          {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      <div className="control-toolbar flex-wrap min-w-0">
        <Button
          variant="outline"
          size="sm"
          onClick={() => clearNewsletter()}
          className="h-8 gap-2 shrink-0"
          title="Reset layout"
        >
          Reset Layout
        </Button>
        <Separator orientation="vertical" className="h-6 shrink-0" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSaveDraft(true)}
          className="h-8 gap-2 shrink-0"
        >
          <Save className="h-4 w-4" />
          {t('saveDraft')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleTestEmail}
          className="h-8 gap-2 shrink-0"
        >
          <Send className="h-4 w-4" />
          {t('sendTest')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportHTML}
          className="h-8 gap-2 shrink-0"
        >
          <Download className="h-4 w-4" />
          {t('exportHTML')}
        </Button>
        <Separator orientation="vertical" className="h-6 shrink-0" />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowSchedule(true)}
          className="h-8 gap-2 shrink-0"
        >
          <Calendar className="h-4 w-4" />
          {t('schedule')}
        </Button>
        <Button
          variant="default"
          size="sm"
          className="h-8 gap-2 shrink-0"
        >
          <Send className="h-4 w-4" />
          {t('send')}
        </Button>
      </div>
    </div>
  );

  // Render left pane (blocks and templates)
  const renderLeftPane = () => (
    <PaneColumn
      data-testid="builder-left-pane"
      header={
        <div className="px-3 pt-3 bg-card">
          <div data-testid="builder-left-tabs">
            <TabsList className="flex flex-wrap items-center gap-2 min-w-0 overflow-visible rounded-lg bg-muted p-1 mb-3">
              <TabsTrigger value="blocks">{t('blocks')}</TabsTrigger>
              <TabsTrigger value="templates">{t('templates')}</TabsTrigger>
            </TabsList>
          </div>
          <Separator />
        </div>
      }
    >
      <TabsContent value="blocks" className="h-full m-0">
        <div className="p-3">
          <BlocksPalette onAddBlock={addBlock} />
        </div>
      </TabsContent>
      <TabsContent value="templates" className="h-full m-0">
        <div className="p-3">
          <TemplateLibrary />
        </div>
      </TabsContent>
    </PaneColumn>
  );

  // Render center pane (canvas/preview)
  const renderCenterPane = () => (
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
  );

  // Render right pane (properties/inspector)
  const renderRightPane = () => (
    <PaneColumn
      data-testid="builder-right-pane"
      header={
        <div className="px-3 pt-3 bg-card">
          <div data-testid="builder-right-tabs">
            <Tabs value={activeRightPanel} onValueChange={(value) => setActiveRightPanel(value as any)}>
              <TabsList className="flex flex-wrap items-center gap-2 min-w-0 overflow-visible rounded-lg bg-muted p-1 mb-3">
                <TabsTrigger value="properties" className="text-xs">{t('properties')}</TabsTrigger>
                <TabsTrigger value="global" className="text-xs">{t('global')}</TabsTrigger>
                <TabsTrigger value="personalization" className="text-xs">{t('personalization')}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <Separator />
        </div>
      }
    >
      <Tabs value={activeRightPanel} onValueChange={(value) => setActiveRightPanel(value as any)} className="h-full">
        <TabsContent value="properties" className="h-full m-0">
          <div className="p-3">
            <PropertiesPanel selectedBlockId={selectedBlockId} />
          </div>
        </TabsContent>
        <TabsContent value="global" className="h-full m-0">
          <div className="p-3">
            <GlobalStylesPanel />
          </div>
        </TabsContent>
        <TabsContent value="personalization" className="h-full m-0">
          <div className="p-3">
            <PersonalizationPanel />
          </div>
        </TabsContent>
      </Tabs>
    </PaneColumn>
  );

  return (
    <div className="h-full bg-background">
      {import.meta.env.DEV && <PaneTabProbe />}
      <Tabs value={activeLeftPanel} onValueChange={(value) => setActiveLeftPanel(value as any)}>
        <CampaignBuilderShell
          toolbar={renderToolbar()}
          left={renderLeftPane()}
          center={renderCenterPane()}
          right={renderRightPane()}
        />
      </Tabs>

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