import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Heading } from '@/components/ui/heading';
import { Button } from '@/components/ui/button';
import { Settings as SettingsIcon, Clock, User, BarChart3 } from 'lucide-react';
import { useOrganizationStore } from '@/stores/organizationStore';
import { AuditTimelinePanel } from './timeline/AuditTimelinePanel';
import { ApplicantAuditPanel } from './applicant/ApplicantAuditPanel';
import { AuditAnalyticsPanel } from './analytics/AuditAnalyticsPanel';
import { RetentionConfigDialog } from './RetentionConfigDialog';
import { AuditEventDetailDrawer } from './timeline/AuditEventDetailDrawer';
import { ApplicantAuditExportDialog } from './applicant/ApplicantAuditExportDialog';
import type { UnifiedAuditEvent } from './types';

const VALID_SUBTABS = ['timeline', 'applicant', 'analytics'] as const;
type SubTab = typeof VALID_SUBTABS[number];

export function AuditTab() {
  const [searchParams, setSearchParams] = useSearchParams();
  const sub = searchParams.get('subtab');
  const activeSub: SubTab = (VALID_SUBTABS.includes(sub as SubTab) ? sub : 'timeline') as SubTab;

  const { currentOrganizationId } = useOrganizationStore();

  const [retentionOpen, setRetentionOpen] = useState(false);
  const [detailEvent, setDetailEvent] = useState<UnifiedAuditEvent | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportApplicantId, setExportApplicantId] = useState<string | null>(null);

  const handleSubChange = (value: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'audit');
    next.set('subtab', value);
    setSearchParams(next, { replace: true });
  };

  return (
    <>
      <div className="space-y-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <Heading level={2} className="text-lg font-semibold">
              Revisjon
            </Heading>
            <p className="text-sm text-muted-foreground">
              Full historikk over alle endringer, automatiseringer og innhentinger i rekrutteringsmodulen.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setRetentionOpen(true)}>
            <SettingsIcon className="h-4 w-4" />
            Innstillinger
          </Button>
        </header>

        <Tabs value={activeSub} onValueChange={handleSubChange}>
          <TabsList>
            <TabsTrigger value="timeline">
              <Clock className="h-4 w-4" />
              Tidslinje
            </TabsTrigger>
            <TabsTrigger value="applicant">
              <User className="h-4 w-4" />
              Søker-revisjon
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart3 className="h-4 w-4" />
              Analyse
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline">
            <AuditTimelinePanel
              organizationId={currentOrganizationId}
              onRowClick={setDetailEvent}
            />
          </TabsContent>
          <TabsContent value="applicant">
            <ApplicantAuditPanel
              organizationId={currentOrganizationId}
              onRowClick={setDetailEvent}
              onExport={(applicantId) => {
                setExportApplicantId(applicantId);
                setExportOpen(true);
              }}
            />
          </TabsContent>
          <TabsContent value="analytics">
            <AuditAnalyticsPanel organizationId={currentOrganizationId} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs at parent (Phase 2 lesson) */}
      <RetentionConfigDialog
        open={retentionOpen}
        onOpenChange={setRetentionOpen}
        organizationId={currentOrganizationId}
      />
      <AuditEventDetailDrawer
        event={detailEvent}
        onOpenChange={(open) => { if (!open) setDetailEvent(null); }}
      />
      <ApplicantAuditExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        applicantId={exportApplicantId}
      />
    </>
  );
}
