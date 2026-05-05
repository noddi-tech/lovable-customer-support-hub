import StalledApplicantsList from './StalledApplicantsList';
import AssignedNoActivityList from './AssignedNoActivityList';
import FollowupsList from './FollowupsList';
import type { OversiktMetrics, AssignmentScope } from '@/hooks/recruitment/useOversiktMetrics';

interface Props {
  data: OversiktMetrics['needs_attention'];
  scope: AssignmentScope;
}

export default function NeedsAttentionSection({ data, scope }: Props) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Trenger oppmerksomhet</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StalledApplicantsList items={data.stage_stalled} />
        {scope !== 'unassigned' && <AssignedNoActivityList items={data.assigned_no_activity} />}
        <FollowupsList today={data.todays_followups} overdue={data.overdue_followups} />
      </div>
    </section>
  );
}
