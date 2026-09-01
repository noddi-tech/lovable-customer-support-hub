import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  PauseCircle,
  Play,
  RefreshCw,
  Timer,
  XCircle,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/hooks/useAuth';
import {
  useBackgroundJobs,
  useBackgroundJobRuns,
  describeSchedule,
  formatDuration,
  nextRunAt,
  canRunManually,
  useRunBackgroundJob,
  type BackgroundJob,
} from '@/hooks/useBackgroundJobs';

function fmtTime(ts: string | null | undefined) {
  if (!ts) return '—';
  try {
    return format(new Date(ts), 'dd.MM.yyyy HH:mm:ss');
  } catch {
    return ts;
  }
}

function fmtRelative(ts: string | null | undefined) {
  if (!ts) return '—';
  try {
    return formatDistanceToNow(new Date(ts), { addSuffix: true });
  } catch {
    return '—';
  }
}

function StatusBadge({ status }: { status: string | null }) {
  if (!status) return <Badge variant="outline">Never run</Badge>;
  if (status === 'succeeded') {
    return (
      <Badge variant="outline" className="text-green-700 border-green-700/40 bg-green-500/10">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        Succeeded
      </Badge>
    );
  }
  if (status === 'running' || status === 'starting' || status === 'sending') {
    return (
      <Badge variant="outline" className="text-blue-700 border-blue-700/40 bg-blue-500/10">
        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
        {status}
      </Badge>
    );
  }
  return (
    <Badge variant="destructive">
      <XCircle className="h-3 w-3 mr-1" />
      {status}
    </Badge>
  );
}

function extractTarget(command: string): string {
  const fnMatch = command.match(/\/functions\/v1\/([a-z0-9-_]+)/i);
  if (fnMatch) return `edge function: ${fnMatch[1]}`;
  const sqlMatch = command.trim().replace(/\s+/g, ' ').slice(0, 90);
  return sqlMatch;
}

const RunHistoryDialog: React.FC<{
  job: BackgroundJob | null;
  onOpenChange: (open: boolean) => void;
}> = ({ job, onOpenChange }) => {
  const { data: runs = [], isLoading } = useBackgroundJobRuns(job?.jobid ?? null, 50);

  return (
    <Dialog open={!!job} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{job?.jobname} — last 50 runs</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : runs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">No runs recorded yet.</p>
        ) : (
          <div className="max-h-[60vh] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Started</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Message</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.runid}>
                    <TableCell className="whitespace-nowrap text-sm">{fmtTime(run.start_time)}</TableCell>
                    <TableCell><StatusBadge status={run.status} /></TableCell>
                    <TableCell className="whitespace-nowrap text-sm">{formatDuration(run.duration_ms)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[280px] truncate">
                      {run.return_message || '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const BackgroundJobsPage: React.FC = () => {
  const { data: jobs = [], isLoading, isFetching, error, refetch } = useBackgroundJobs();
  const [selected, setSelected] = React.useState<BackgroundJob | null>(null);
  const runJob = useRunBackgroundJob();
  const { user, role, isAdmin } = useAuth();

  const totals = React.useMemo(() => {
    return {
      total: jobs.length,
      active: jobs.filter((j) => j.active).length,
      runs24h: jobs.reduce((sum, j) => sum + Number(j.runs_24h || 0), 0),
      failures24h: jobs.reduce((sum, j) => sum + Number(j.failures_24h || 0), 0),
    };
  }, [jobs]);

  return (
    <div className="h-full overflow-auto">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Background Jobs</h1>
            <p className="text-sm text-muted-foreground">
              Scheduled jobs and cron tasks with their schedule, latest run status and duration.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Total jobs</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{totals.total}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Active</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{totals.active}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Runs (24h)</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{totals.runs24h}</CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">Failures (24h)</CardTitle>
            </CardHeader>
            <CardContent
              className={`text-2xl font-semibold ${totals.failures24h > 0 ? 'text-destructive' : ''}`}
            >
              {totals.failures24h}
            </CardContent>
          </Card>
        </div>

        {error ? (
          <Card>
            <CardContent className="py-8 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-4 w-4" />
                Could not load background jobs.
              </div>
              <p className="text-muted-foreground">
                Signed in as {user?.email ?? 'nobody (not signed in)'} — roles:{' '}
                {role ?? 'none'}{isAdmin ? '' : ' (no admin access)'}. Admin or super admin access
                is required.
              </p>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap break-all">
                {(error as any)?.message ?? String(error)}
              </pre>
            </CardContent>
          </Card>
        ) : !isLoading && jobs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">
              No background jobs are visible for your account. This usually means your user lacks
              the admin or super admin role (signed in as {user?.email ?? 'unknown'}).
            </CardContent>
          </Card>
        ) : isLoading ? (

          <Card>
            <CardContent className="py-12 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <TooltipProvider>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Last run</TableHead>
                      <TableHead>Next run</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Avg (24h)</TableHead>
                      <TableHead className="text-right">Runs / fails (24h)</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {jobs.map((job) => {
                      const next = job.active ? nextRunAt(job.schedule) : null;
                      const runnable = canRunManually(job);
                      const isRunning = runJob.isPending && runJob.variables === job.jobid;
                      return (
                      <TableRow key={job.jobid}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {!job.active && (
                              <PauseCircle className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            <div>
                              <div className="font-medium text-sm">{job.jobname}</div>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className="text-xs text-muted-foreground truncate max-w-[260px]">
                                    {extractTarget(job.command)}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent className="max-w-md">
                                  <pre className="text-xs whitespace-pre-wrap break-all">{job.command}</pre>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-sm inline-flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                {describeSchedule(job.schedule)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <code className="text-xs">{job.schedule}</code>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span>{fmtRelative(job.last_start)}</span>
                            </TooltipTrigger>
                            <TooltipContent>{fmtTime(job.last_start)}</TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                          {next ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>{fmtRelative(next.toISOString())}</span>
                              </TooltipTrigger>
                              <TooltipContent>{fmtTime(next.toISOString())}</TooltipContent>
                            </Tooltip>
                          ) : (
                            <span>{job.active ? '—' : 'Paused'}</span>
                          )}
                        </TableCell>
                        <TableCell><StatusBadge status={job.last_status} /></TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {formatDuration(job.last_duration_ms)}
                        </TableCell>
                        <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Timer className="h-3.5 w-3.5" />
                            {formatDuration(job.avg_duration_ms)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-sm whitespace-nowrap">
                          {job.runs_24h}
                          {' / '}
                          <span className={Number(job.failures_24h) > 0 ? 'text-destructive font-medium' : ''}>
                            {job.failures_24h}
                          </span>
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="mr-1"
                                  disabled={!runnable || runJob.isPending}
                                  onClick={() => runJob.mutate(job.jobid)}
                                >
                                  {isRunning ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Play className="h-3.5 w-3.5" />
                                  )}
                                  <span className="ml-1.5 hidden md:inline">Run</span>
                                </Button>
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {runnable
                                ? 'Run this job now'
                                : 'This job cannot be triggered manually'}
                            </TooltipContent>
                          </Tooltip>
                          <Button variant="ghost" size="sm" onClick={() => setSelected(job)}>
                            History
                          </Button>
                        </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>

                </Table>
              </TooltipProvider>
            </CardContent>
          </Card>
        )}
      </div>

      <RunHistoryDialog job={selected} onOpenChange={(open) => !open && setSelected(null)} />
    </div>
  );
};

export default BackgroundJobsPage;
