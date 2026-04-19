import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useApplicantPipeline } from './applicants/useApplicants';
import { usePipelineApplications, type PipelineFilters as Filters } from './pipeline/usePipeline';
import PipelineFilters from './pipeline/PipelineFilters';
import PipelineBoard from './pipeline/PipelineBoard';
import PipelineEmptyState from './pipeline/PipelineEmptyState';

const RecruitmentPipeline: React.FC = () => {
  const [filters, setFilters] = useState<Filters>({ positionId: 'all', assignedTo: 'all' });
  const { data: pipeline, isLoading: pipelineLoading } = useApplicantPipeline();
  const { data: applications, isLoading: appsLoading } = usePipelineApplications(filters);

  const isLoading = pipelineLoading || appsLoading;
  const apps = applications ?? [];

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] p-6 gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Pipeline</h2>
      </div>

      <PipelineFilters value={filters} onChange={setFilters} totalCount={apps.length} />

      {isLoading ? (
        <div className="flex gap-4 flex-1 min-h-0">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="w-[280px] flex-shrink-0 h-full" />
          ))}
        </div>
      ) : !pipeline || pipeline.stages.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          Ingen pipeline konfigurert
        </div>
      ) : apps.length === 0 && filters.positionId === 'all' && filters.assignedTo === 'all' ? (
        <PipelineEmptyState />
      ) : (
        <PipelineBoard applications={apps} stages={pipeline.stages} filters={filters} />
      )}
    </div>
  );
};

export default RecruitmentPipeline;
