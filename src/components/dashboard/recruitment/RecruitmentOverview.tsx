import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import OversiktFilters from './overview/OversiktFilters';
import NeedsAttentionSection from './overview/NeedsAttentionSection';
import PipelineSummary from './overview/PipelineSummary';
import MetricsRow from './overview/MetricsRow';
import QuickActionsBar from './overview/QuickActionsBar';
import EmptyOnboarding from './overview/EmptyOnboarding';
import {
  useOversiktMetrics,
  type AssignmentScope,
  type TimeWindow,
} from '@/hooks/recruitment/useOversiktMetrics';
import { useOversiktRealtime } from '@/hooks/recruitment/useOversiktRealtime';
import { useJobPositions } from './positions/usePositions';
import CreateApplicantDialog from './applicants/CreateApplicantDialog';
import { useNavigate } from 'react-router-dom';

const RecruitmentOverview: React.FC = () => {
  const navigate = useNavigate();
  const [positionId, setPositionId] = useState<string | null>(null);
  const [timeWindow, setTimeWindow] = useState<TimeWindow>('30d');
  const [scope, setScope] = useState<AssignmentScope>('all');
  const [createOpen, setCreateOpen] = useState(false);

  const { connected } = useOversiktRealtime();
  const { data, isLoading, isFetching, refetch } = useOversiktMetrics({
    position_id: positionId,
    time_window: timeWindow,
    assignment_scope: scope,
  });
  const { data: positions } = useJobPositions();

  const isEmpty = !isLoading && data && data.org_total_applicants === 0;

  return (
    <div className="p-6 max-w-[1400px] mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-semibold">Oversikt</h1>
      </div>

      <OversiktFilters
        positionId={positionId}
        positions={(positions ?? []).map((p: any) => ({ id: p.id, title: p.title }))}
        timeWindow={timeWindow}
        scope={scope}
        realtimeConnected={connected}
        isFetching={isFetching}
        onPositionChange={setPositionId}
        onTimeWindowChange={setTimeWindow}
        onScopeChange={setScope}
        onRefresh={() => refetch()}
      />

      {isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
            <Skeleton className="h-48" />
          </div>
        </div>
      )}

      {isEmpty && <EmptyOnboarding onAddApplicant={() => setCreateOpen(true)} />}

      {!isLoading && data && !isEmpty && (
        <>
          <NeedsAttentionSection data={data.needs_attention} scope={scope} />
          <PipelineSummary data={data.pipeline_summary} />
          <MetricsRow data={data.metrics} />
          <QuickActionsBar
            onAddApplicant={() => setCreateOpen(true)}
            onImport={() => navigate('/admin/recruitment')}
          />
        </>
      )}

      {!isLoading && !data && (
        <Card>
          <CardContent className="pt-6 text-center text-sm text-muted-foreground">
            Klarte ikke laste oversikt.
          </CardContent>
        </Card>
      )}

      <CreateApplicantDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
};

export default RecruitmentOverview;
